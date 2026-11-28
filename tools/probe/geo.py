"""Temporary probe: what does Georacing deliver for an SSL race? Lists every key (all.json untrimmed, races.json, live.json,
player JS endpoints) so we know which data could feed a richer live ticker."""
import json, os, re, urllib.request
H = {"User-Agent": "Mozilla/5.0 Chrome/131", "Referer": "https://player.georacing.com/"}
def get(u, raw=False):
    try:
        b = urllib.request.urlopen(urllib.request.Request(u, headers=H), timeout=30).read()
        return b if raw else json.loads(b)
    except Exception as e: return {"_err": str(e)[:200]}
os.makedirs("out", exist_ok=True)
def shape(x, d=0):
    if isinstance(x, dict): return {k: shape(v, d + 1) for k, v in list(x.items())[:60]} if d < 5 else "{…}"
    if isinstance(x, list): return [shape(x[0], d + 1), f"len={len(x)}"] if x else []
    return type(x).__name__ + ":" + str(x)[:60]
app = get("https://player.georacing.com/datas/applications/app_46.json")
json.dump(shape(app), open("out/app46.json", "w"), indent=1)
ev = [e for e in app.get("events", []) if "2026" in e.get("name", "") and "1/16" in e.get("name", "")]
res = {"events": [(e["id"], e["name"]) for e in app.get("events", [])]}
if ev:
    e = ev[0]; races = get(f"https://player.georacing.com/datas/{e['id']}/races.json"); json.dump(races, open("out/races.json", "w"), indent=1)
    rc = races[-1]["id"] if isinstance(races, list) and races else None
    for x in races if isinstance(races, list) else []:
        if re.search(r"Race\s*2\s*-\s*Group\s*C", x.get("name") or "", re.I): rc = x["id"]
    a = get(f"https://player.georacing.com/datas/{e['id']}/{rc}/all.json")
    json.dump(shape(a), open("out/all_shape.json", "w"), indent=1)
    json.dump(a, open("out/all_full.json", "w"))
    for nm in ["live.json", "infos.json", "events.json", "messages.json", "penalties.json", "ranking.json", "stats.json", "comments.json", "news.json", "weather.json"]:
        for base in ["https://data-live.georacing.com/datas/", "https://player.georacing.com/datas/"]:
            r = get(f"{base}{e['id']}/{rc}/{nm}")
            res[f"{base[8:20]}…/{nm}"] = shape(r) if not (isinstance(r, dict) and "_err" in r) else r["_err"]
    res["race"] = rc
html = get("https://player.georacing.com/", raw=True)
if isinstance(html, bytes):
    t = html.decode("utf8", "replace"); js = re.findall(r'src="([^"]+\.js)"', t); res["js"] = js
    eps = set()
    for j in js[:8]:
        u = j if j.startswith("http") else "https://player.georacing.com/" + j.lstrip("/")
        b = get(u, raw=True)
        if isinstance(b, bytes):
            s = b.decode("utf8", "replace")
            eps |= set(re.findall(r'["\'`]([a-z_]+\.(?:json|bin))["\'`]', s)); eps |= set(re.findall(r'datas/[^"\'`\s]{0,80}', s))
    res["endpoints"] = sorted(eps)[:200]
json.dump(res, open("out/res.json", "w"), indent=1)
