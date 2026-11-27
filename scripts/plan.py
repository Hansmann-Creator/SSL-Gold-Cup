#!/usr/bin/env python3
"""Race-day plan for the live loop (.github/workflows/live.yml).

Same schedule as app.js SCH / build_extras.py: generated round days + sched.json (Race Committee changes)
+ semi-finals and finals. Race length comes from timing.json (learned from Georacing, default 45 min).

  plan.py window   -> "START END FIRST" (UTC epoch seconds) for today's Rio date, or "none"
                      START = first start - 60 min (livestream, tracking, reminders begin)
                      END   = latest (planned or actual) start + race length + 120 min
  plan.py results  -> "on" once the first race of the day is close to finishing
                      (first start + race length - 15 min), otherwise "off"
Optional: --now <epoch> for testing.
"""
import json, os, sys, datetime

ROOT = os.path.join(os.path.dirname(__file__), "..")
RIO = datetime.timezone(datetime.timedelta(hours=-3))
ROT = [["A", "B", "C", "D"], ["D", "A", "B", "C"], ["C", "D", "A", "B"], ["B", "C", "D", "A"]]
T4 = ["12:00", "13:10", "14:30", "16:00"]
T32 = [["12:00", "13:20", "14:40", "16:00"], ["11:00", "12:20", "13:40", "15:00"], ["12:00", "13:20", "14:40", "16:00"], ["12:00", "13:20", "14:40", "16:00"]]
DAYS = {"r32": ["2026-11-19", "2026-11-20", "2026-11-21", "2026-11-22"], "r16": ["2026-11-26", "2026-11-27", "2026-11-28", "2026-11-29"],
        "r8": ["2026-12-02", "2026-12-03", "2026-12-04", "2026-12-05"], "r4": ["2026-12-07", "2026-12-08", "2026-12-09", "2026-12-10"]}
LEAD, TAIL, EARLY = 60, 120, 15   # minutes


def load(name, default):
    try: return json.load(open(os.path.join(ROOT, name), encoding="utf-8"))
    except Exception: return default


def schedule():
    sov = load("sched.json", {}).get("days", {})
    S = []
    for rid, ds in DAYS.items():
        for i, d in enumerate(ds):
            if d in sov: continue
            S += [dict(rid=rid, d=d, t=(T32[i] if rid == "r32" else T4)[j], g=g, n=i + 1) for j, g in enumerate(ROT[i])]
    for d, L in sov.items():
        S += [dict(rid=e["rid"], d=d, t=e["t"], g=e["g"], n=e["n"]) for e in L]
    S += [dict(rid="sf", d="2026-12-12", t="12:00", g="A", n=1), dict(rid="sf", d="2026-12-12", t="13:10", g="B", n=1),
          dict(rid="pf", d="2026-12-13", t="12:00", g="A", n=1), dict(rid="f", d="2026-12-13", t="13:10", g="A", n=1)]
    return S


def ts(x):
    return datetime.datetime.fromisoformat(f"{x['d']}T{x['t']}:00-03:00").timestamp()


def main():
    now = datetime.datetime.now(datetime.timezone.utc).timestamp()
    if "--now" in sys.argv: now = float(sys.argv[sys.argv.index("--now") + 1])
    today = datetime.datetime.fromtimestamp(now, RIO).strftime("%Y-%m-%d")
    T = load("timing.json", {})
    dur = (T.get("dur") or 45) * 60
    races = [x for x in schedule() if x["d"] == today]
    # a loop that runs past midnight UTC/Rio still belongs to the race day that started it
    if not races:
        y = (datetime.datetime.fromtimestamp(now, RIO) - datetime.timedelta(days=1)).strftime("%Y-%m-%d")
        races = [x for x in schedule() if x["d"] == y]
        if races and now > max(map(ts, races)) + dur + TAIL * 60 + 6 * 3600: races = []
    mode = sys.argv[1] if len(sys.argv) > 1 else "window"
    if not races:
        print("none" if mode == "window" else "off"); return
    first = min(map(ts, races)); last = max(map(ts, races))
    keys = {f"{x['rid']}|{x['g']}|{x['n']}" for x in races}
    for k, o in (T.get("races") or {}).items():          # delays: actual starts from Georacing
        if k in keys and o.get("s"):
            try: last = max(last, datetime.datetime.fromisoformat(o["s"].replace("Z", "+00:00")).timestamp())
            except Exception: pass
    for k, o in (load("flags.json", {}).get("races") or {}).items():   # manual "not before" notes
        if k in keys and o.get("nb"):
            try: last = max(last, datetime.datetime.fromisoformat(o["nb"].replace("Z", "+00:00")).timestamp())
            except Exception: pass
    if mode == "window":
        print(int(first - LEAD * 60), int(last + dur + TAIL * 60), int(first))
    else:
        print("on" if now >= first + dur - EARLY * 60 else "off")


if __name__ == "__main__":
    main()
