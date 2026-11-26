"""Daily refresh of squads, sailor profiles and individual rankings (runs at night, Rio time).

Steps
 1. fetch the official team pages (xxx.sslgoldcup.com) and rebuild roster.json with tools/positions/rebuild.py
 2. plausibility: a team page missing / empty, a squad shrinking by more than 30 % or the whole roster changing
    by more than 15 % -> keep yesterday's roster and report it
 3. removals only after the sailor is missing on two days in a row (pending list in sp/_daily_state.json)
 4. manual corrections in overrides.json always win (this script never writes that file)
 5. sailor profiles + rankings (scripts/sailors.py); if far fewer sailors are matched than before -> keep the old data
 6. change log appended to updates.json; report.md for the GitHub issue (anomalies and squad changes)
"""
import json, os, re, subprocess, sys, time, datetime, copy
sys.path.insert(0, os.path.dirname(__file__))
from profiles import text, fetch

ROOT = os.path.join(os.path.dirname(__file__), "..")
P = lambda *a: os.path.join(ROOT, *a)
load = lambda f, d=None: json.load(open(P(f), encoding="utf-8")) if os.path.exists(P(f)) else d
save = lambda f, o, **k: os.makedirs(os.path.dirname(P(f)), exist_ok=True) or json.dump(o, open(P(f), "w", encoding="utf-8"), ensure_ascii=False, **(k or {"separators": (",", ":")}))
today = (datetime.datetime.utcnow() - datetime.timedelta(hours=3)).strftime("%Y-%m-%d")
issues, notes = [], []


def names(r): return {row[0] for row in r["s"]}


def roster():
    old = load("roster.json")
    pages = {}
    for code in old:
        s = fetch(f"https://{code.lower()}.sslgoldcup.com/")
        pages[code] = text(s) if s else None
        time.sleep(0.3)
    missing = [c for c, t in pages.items() if not t or "|Squad|" not in t]
    if len(missing) > 5:
        issues.append(f"{len(missing)} team pages not reachable or without squad ({', '.join(missing[:12])}) – squads unchanged")
        return
    json.dump({"teams": pages, "roles": {}}, open("/tmp/audit_daily.json", "w"), ensure_ascii=False)
    args = [sys.executable, P("tools", "positions", "rebuild.py"), "/tmp/audit_daily.json"]
    if os.path.exists(P("tools", "positions", "xls.json")): args.append(P("tools", "positions", "xls.json"))
    r = subprocess.run(args, cwd=ROOT, capture_output=True, text=True)
    if r.returncode:
        issues.append("roster rebuild failed: " + (r.stderr or r.stdout)[-600:]); save("roster.json", old); return
    new = load("roster.json")
    for c in missing: new[c] = old[c]           # no page today -> keep the team as it was
    st = load("sp/_daily_state.json", {"pending": {}})
    pend, nxt = st.get("pending", {}), {}
    ov = load("overrides.json", {}) or {}
    added, removed = {}, {}
    for code, o in old.items():
        n = new.get(code) or copy.deepcopy(o)
        a = names(n) - names(o); gone = names(o) - names(n)
        if len(n["s"]) < 0.7 * len(o["s"]) or not n["s"]:
            issues.append(f"{code}: squad would shrink from {len(o['s'])} to {len(n['s'])} – kept as before"); new[code] = o; continue
        # removals need two days in a row
        keep_rows = []
        for row in o["s"]:
            if row[0] in gone:
                k = f"{code}|{row[0]}"
                if k in pend: removed.setdefault(code, []).append(row[0])
                else: nxt[k] = today; keep_rows.append(row)
        n["s"] += keep_rows
        if a: added[code] = sorted(a)
        new[code] = n
    # manual corrections win
    for key, fix in (ov.get("set") or {}).items():
        code, nm = key.split("|", 1)
        for row in new.get(code, {}).get("s", []):
            if row[0] == nm:
                if "pos" in fix: row[1] = fix["pos"]
                if "no" in fix: row[2] = str(fix["no"])
                if "ks" in fix: row[3:] = [fix["ks"]]
    for code, L in (ov.get("keep") or {}).items():
        have = names(new.get(code, {"s": []}))
        for row in old.get(code, {}).get("s", []):
            if row[0] in L and row[0] not in have: new[code]["s"].append(row)
    for code, L in (ov.get("drop") or {}).items():
        if code in new: new[code]["s"] = [r for r in new[code]["s"] if r[0] not in L]
    tot_o = sum(len(v["s"]) for v in old.values()); tot_n = sum(len(v["s"]) for v in new.values())
    if abs(tot_n - tot_o) > 0.15 * tot_o:
        issues.append(f"roster would change from {tot_o} to {tot_n} sailors – kept as before"); save("roster.json", old); return
    save("roster.json", new)
    save("sp/_daily_state.json", {"pending": nxt}, indent=0)
    if added: notes.append("New sailors: " + "; ".join(f"{c}: {', '.join(v)}" for c, v in added.items()))
    if removed: notes.append("Removed (missing two days): " + "; ".join(f"{c}: {', '.join(v)}" for c, v in removed.items()))
    if nxt: notes.append(f"{len(nxt)} sailor(s) missing on a team page today – removed tomorrow if still missing")
    return {"added": added, "removed": removed}


def profiles():
    before = load("profiles.json", {}) or {}
    r = subprocess.run([sys.executable, P("scripts", "sailors.py"), "all", "100"], cwd=ROOT, capture_output=True, text=True)
    print(r.stdout[-2000:], r.stderr[-2000:])
    after = load("profiles.json", {}) or {}
    if r.returncode or len(after) < 0.85 * len(before):
        issues.append(f"profiles: {len(after)} matched (before {len(before)}) – kept the previous data")
        subprocess.run(["git", "checkout", "--", "profiles.json", "sp", "rank/ind.json"], cwd=ROOT)
        return {"before": len(before), "after": len(before)}
    bio = sum(1 for k, v in after.items() if v.get("bio") and v.get("bio") != (before.get(k) or {}).get("bio"))
    newp = len(set(after) - set(before))
    if newp or bio: notes.append(f"Profiles: {len(after)} sailors matched, {newp} new, {bio} bios new or changed")
    return {"before": len(before), "after": len(after), "newBios": bio}


def main():
    ro = roster() or {}
    pr = profiles()
    log = load("updates.json", []) or []
    log.insert(0, {"d": today, "roster": ro, "profiles": pr, "issues": issues, "notes": notes})
    save("updates.json", log[:60], indent=0)
    rep = []
    if issues: rep += ["**Kept the previous data (plausibility check):**"] + [f"- {x}" for x in issues]
    if notes: rep += ["", "**Changes:**"] + [f"- {x}" for x in notes]
    open("/tmp/report.md", "w").write("\n".join(rep))
    print("\n".join(rep) or "no changes")
    # exit code 3 = something worth a message
    sys.exit(3 if issues or (ro.get("added") or ro.get("removed")) else 0)


if __name__ == "__main__":
    main()
