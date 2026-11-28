"""Race ticker data from Georacing: who rounded each mark when (order + gaps), wind, and Georacing's race stats
(time in lead, manoeuvres, top speed, distance). Writes tk/<round>_<group>_<race>.json, one file per race; the app
turns it into the ticker text in every language (pRace → tkLoad).

Georacing sometimes clears a finished race (27 Nov D1), so a file is never replaced by one with fewer roundings.
  python3 scripts/ticker.py            races of today (Rio), used by the live loop
  python3 scripts/ticker.py all        every 2026 Final Series race
  python3 scripts/ticker.py dir DIR    offline: DIR/index.json + DIR/<race>_all.json / _stats.json (probe output)
Prints 'changed' when a file was written."""
import json, urllib.request, re, datetime, os, sys, statistics
ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..")
OUT = os.path.join(ROOT, "tk")
H = {"User-Agent": "Mozilla/5.0 Chrome/131", "Referer": "https://player.georacing.com/"}
RM = [("1/32", "r32"), ("1/16", "r16"), ("1/8", "r8"), ("1/4", "r4"), ("Quarter", "r4"), ("1/2", "sf"), ("Semi", "sf")]
P = lambda s: datetime.datetime.fromisoformat(s.replace("Z", "+00:00"))


def get(u):
    return json.load(urllib.request.urlopen(urllib.request.Request(u, headers=H), timeout=25))


def race_key(evname, name):
    rid = next((v for k, v in RM if k in evname), None)
    m = re.match(r"Race\s*(\d)\s*-\s*Group\s*([A-D])", name or "", re.I)
    if m and rid: return f"{rid}|{m.group(2).upper()}|{m.group(1)}"
    if re.search(r"petit", name or "", re.I): return "pf|A|1"
    if re.fullmatch(r"\s*(grand\s*)?final\s*", name or "", re.I): return "f|A|1"
    if rid == "sf" and (m2 := re.search(r"\b([AB])\b", name or "")): return f"sf|{m2.group(1)}|1"
    return None


def build(a, st):
    """Compact ticker data from all.json (+ stats.json)."""
    r = a.get("race") or {}
    act = {str(x["id"]): (x.get("short_name") or "").upper() for x in a.get("actors") or []}
    course = next((c for c in a.get("courses") or [] if c.get("active")), None)
    laps = None
    if course and (m := re.search(r"(\d+)\s*lap", course.get("name") or "", re.I)): laps = int(m.group(1))
    marks = []
    for sp in a.get("splittimes") or []:
        rows = sorted([t for t in sp.get("splittimes") or [] if t.get("time") and str(t.get("actor_id")) in act], key=lambda t: t["time"])
        if rows: marks.append({"n": sp.get("name"), "r": sp.get("role") or "none", "t": [[act[str(t["actor_id"])], t["time"]] for t in rows]})
    s0 = P(marks[0]["t"][0][1]) if marks else None
    s1 = P(marks[-1]["t"][-1][1]) if marks else None
    w = None
    if s0:   # wind direction around the race (Georacing's own readings), median
        ws = [x["wind_direction"] for x in a.get("weathers") or [] if x.get("wind_direction") is not None and x.get("time")
              and s0 - datetime.timedelta(minutes=30) <= P(x["time"]) <= (s1 or s0) + datetime.timedelta(minutes=5)]
        if ws: w = round(statistics.median(ws))
    stats = None
    if st and st.get("success") and st.get("data"):
        stats = {}
        for d in st["data"]:
            c = (d.get("nationality") or "").upper()
            if c not in act.values(): continue
            stats[c] = [round(d.get("time_first_percentage") or 0), d.get("tack_count"),
                        round((d.get("max_speed") or 0) * 1.94384, 1), round((d.get("distance_km") or 0) / 1.852, 2)]
    return {"plan": r.get("start_time"), "laps": laps, "w": w, "m": marks, "st": stats or None,
            "teams": sorted(act.values())}


def save(key, o):
    os.makedirs(OUT, exist_ok=True)
    p = os.path.join(OUT, key.replace("|", "_") + ".json")
    old = json.load(open(p)) if os.path.exists(p) else None
    n = lambda x: sum(len(m["t"]) for m in (x or {}).get("m") or [])
    if old and n(o) < n(old):          # Georacing cleared (part of) the race: keep what we had
        o["m"] = old["m"]; o["w"] = o["w"] or old.get("w")
    if old and not o.get("st") and old.get("st"): o["st"] = old["st"]
    if not o["m"] and not old: return False
    o["k"] = key
    new = json.dumps(o, separators=(",", ":"), sort_keys=True)
    if old is not None and json.dumps(old, separators=(",", ":"), sort_keys=True) == new: return False
    open(p, "w").write(new)
    return True


def main():
    mode = sys.argv[1] if len(sys.argv) > 1 else "today"
    today = (datetime.datetime.now(datetime.timezone.utc) - datetime.timedelta(hours=3)).strftime("%Y-%m-%d")
    changed = []
    if mode == "dir":
        d = sys.argv[2]
        for x in json.load(open(os.path.join(d, "index.json"))):
            k = race_key(x.get("evname") or "", x.get("name") or "")
            if not k: continue
            ld = lambda f: json.load(open(os.path.join(d, f"{x['race']}_{f}.json")))
            st = ld("stats")
            if save(k, build(ld("all"), st)): changed.append(k)
    else:
        for e in get("https://player.georacing.com/datas/applications/app_46.json").get("events", []):
            if "2026" not in e.get("name", "") or "Qualif" in e.get("name", ""): continue
            for x in get(f"https://player.georacing.com/datas/{e['id']}/races.json"):
                k = race_key(e["name"], x.get("name"))
                if not k: continue
                stt = x.get("start_time") or ""
                if mode != "all" and (not stt or (P(stt) - datetime.timedelta(hours=3)).strftime("%Y-%m-%d") != today): continue
                a = get(f"https://player.georacing.com/datas/{e['id']}/{x['id']}/all.json")
                try: st = get(f"https://player.georacing.com/datas/{e['id']}/{x['id']}/stats.json")
                except Exception: st = None
                if save(k, build(a, st)): changed.append(k)
    print(("changed " + " ".join(changed)) if changed else "same")


if __name__ == "__main__":
    try: main()
    except Exception as ex:
        print("ticker:", ex); sys.exit(1)
