"""Learn race timing from Georacing: actual start / finish of every 2026 Final Series race,
the operator's current start time for upcoming races, and the typical race length and changeover.
Writes timing.json (read by the app to estimate delays). Prints 'changed' when the file changed."""
import json, urllib.request, re, statistics, datetime, os, sys
H = {"User-Agent": "Mozilla/5.0 Chrome/131", "Referer": "https://player.georacing.com/"}
get = lambda u: json.load(urllib.request.urlopen(urllib.request.Request(u, headers=H), timeout=20))
RM = [("1/32", "r32"), ("1/16", "r16"), ("1/8", "r8"), ("1/4", "r4"), ("Quarter", "r4"), ("1/2", "sf"), ("Semi", "sf")]
P = lambda s: datetime.datetime.fromisoformat(s.replace("Z", "+00:00")) if s else None
Z = lambda d: d.astimezone(datetime.timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ") if d else None
out, rows = {}, []
try: OLD = json.load(open(os.path.join(os.path.dirname(__file__), "..", "timing.json"))).get("races") or {}
except Exception: OLD = {}
try:
    for e in get("https://player.georacing.com/datas/applications/app_46.json").get("events", []):
        if "2026" not in e.get("name", "") or "Qualif" in e.get("name", ""): continue
        rid = next((v for k, v in RM if k in e["name"]), None)
        for x in get(f"https://player.georacing.com/datas/{e['id']}/races.json"):
            nm = x.get("name") or ""
            m = re.match(r"Race\s*(\d)\s*-\s*Group\s*([A-D])", nm, re.I)
            if m and rid: key = f"{rid}|{m.group(2).upper()}|{m.group(1)}"
            elif re.search(r"petit", nm, re.I): key = "pf|A|1"
            elif re.fullmatch(r"\s*(grand\s*)?final\s*", nm, re.I): key = "f|A|1"
            elif rid == "sf" and (m2 := re.search(r"\b([AB])\b", nm)): key = f"sf|{m2.group(1)}|1"
            else: continue
            a = get(f"https://player.georacing.com/datas/{e['id']}/{x['id']}/all.json")
            r = a.get("race") or {}
            sp = {s.get("role"): [P(t["time"]) for t in s.get("splittimes") or [] if t.get("time")] for s in a.get("splittimes") or [] if s.get("role") in ("start", "finish")}
            na = len(a.get("actors") or [])
            st = min(sp["start"]) if sp.get("start") else None
            fin = sp.get("finish") or []
            o = {"plan": Z(P(r.get("start_time"))), "s": Z(st), "f": Z(max(fin)) if fin and len(fin) >= max(na, 1) else None, "nf": len(fin), "na": na,
                 "f1": Z(min(fin)) if fin else None}
            # a boat that never finishes (penalty, OCS, retired – 28 Nov A3 EST) must not keep the race 'on the water':
            # 10 min after the last finish the race counts as over
            if fin and not o["f"] and (datetime.datetime.now(datetime.timezone.utc) - max(fin)).total_seconds() > 600:
                o["f"] = Z(max(fin))
            prev = OLD.get(key) or {}
            # when the race office last changed the start time in Georacing (a time set before the prior race
            # finished is the morning schedule, not a decision)
            o["pa"] = prev.get("pa") if prev.get("plan") == o["plan"] and prev.get("pa") else datetime.datetime.now(datetime.timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")
            # a 'start' before the operator's current start time = recalled/abandoned/postponed start (28 Nov A3: two boats
            # crossed at 14:44, the race office then set 15:12) – not the real start
            ok = lambda t: not (t and o["plan"] and (P(o["plan"]) - P(t)).total_seconds() > 60)
            if not ok(o["s"]): o["s"], o["f"], o["nf"], o["f1"] = None, None, 0, None
            # Georacing sometimes clears a finished race (27 Nov D1: start/finish vanished after 40 min): keep what we saw
            if not o["s"] and prev.get("s") and ok(prev["s"]): o["s"] = prev["s"]
            if not o["f"] and prev.get("f") and o["s"] == prev.get("s"): o["f"] = prev["f"]; o["nf"] = max(o["nf"], prev.get("nf") or 0)
            if not o.get("f1") and prev.get("f1") and o["s"] == prev.get("s"): o["f1"] = prev["f1"]
            out[key] = o
            if o["s"] and o["f"]: rows.append((P(o["s"]), P(o["f"])))
except Exception as ex:
    print("timing:", ex); sys.exit(1)
rows.sort()
dur = [(f - s).total_seconds() / 60 for s, f in rows if 15 < (f - s).total_seconds() / 60 < 120]
gap = [(rows[i + 1][0] - rows[i][1]).total_seconds() / 60 for i in range(len(rows) - 1)
       if rows[i + 1][0].date() == rows[i][1].date() and 5 < (rows[i + 1][0] - rows[i][1]).total_seconds() / 60 < 120]
res = {"dur": round(statistics.median(dur), 1) if dur else 45, "gap": round(statistics.median(gap), 1) if gap else 35,
       "dmin": round(min(dur), 1) if dur else 35, "gmin": round(min(gap), 1) if gap else 25,
       "nd": len(dur), "ng": len(gap), "races": dict(sorted(out.items()))}
path = os.path.join(os.path.dirname(__file__), "..", "timing.json")
old = open(path).read() if os.path.exists(path) else ""
new = json.dumps(res, separators=(",", ":"), sort_keys=True)
if new != old:
    open(path, "w").write(new); print("changed", res["dur"], res["gap"], res["nd"], res["ng"])
else:
    print("same")
