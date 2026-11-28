import json, os, urllib.request
os.makedirs("out", exist_ok=True)
def get(u):
    with urllib.request.urlopen(urllib.request.Request(u, headers={"User-Agent": "Mozilla/5.0 Chrome/131", "Referer": "https://player.georacing.com/"}), timeout=30) as r: return json.loads(r.read())
ev = 102235
races = get(f"https://player.georacing.com/datas/applications/app_46.json")
ids = []
for e in races["events"]:
    if e["id"] == ev: ids = [(x["id"], x["name"]) for x in e["races"]]
out = {}
for rid, nm in ids:
    try: out[f"{rid} {nm}"] = get(f"https://player.georacing.com/datas/{ev}/{rid}/stats.json")
    except Exception as x: out[f"{rid} {nm}"] = str(x)
json.dump(out, open("out/stats_full.json", "w"), indent=1)
