"""Prints 'hot' when a race is about to finish or has just finished but its official result is not online yet
(so the live loop checks more often). Uses timing.json (learned race length) and results.json."""
import json, datetime, os
R = os.path.join(os.path.dirname(__file__), "..")
P = lambda s: datetime.datetime.fromisoformat(s.replace("Z", "+00:00")) if s else None
now = datetime.datetime.now(datetime.timezone.utc)
try:
    T = json.load(open(os.path.join(R, "timing.json"))); D = json.load(open(os.path.join(R, "results.json")))
except Exception:
    print("cold"); raise SystemExit
dur = datetime.timedelta(minutes=T.get("dur") or 45)
def has_result(key):
    rid, g, n = key.split("|")
    for r in D.get("rounds", []):
        if r["id"] == rid:
            for gr in r["groups"]:
                if gr["id"] == g:
                    return any(str((row.get("r") or [""] * 9)[int(n) - 1]).strip() for row in gr["rows"])
    return False
hot = False
for k, o in (T.get("races") or {}).items():
    s, f = P(o.get("s")), P(o.get("f"))
    if not s or has_result(k): continue
    if not f and s + dur - datetime.timedelta(minutes=8) <= now <= s + dur + datetime.timedelta(minutes=60): hot = True
    if f and now - f <= datetime.timedelta(minutes=30): hot = True
print("hot" if hot else "cold")
