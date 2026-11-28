import json, os, sys, collections, datetime
sys.path.insert(0, "scripts")
import course as C
os.makedirs("out", exist_ok=True)
ev, rc = 102235, 103537
a = C.get(f"{C.GEOD}{ev}/{rc}/all.json")
r = a["race"]; t0 = C.P(r["start_time"]); t1 = t0 + datetime.timedelta(minutes=45)
pos = C.positions(ev, rc, t0.timestamp()*1000 - 120000, t1.timestamp()*1000)
out = {"n": len(pos), "fields": {}}
cnt = collections.defaultdict(list)
for p in pos:
    for k, v in p.items():
        if v is not None: cnt[k].append(v)
for k, v in cnt.items():
    nums = [x for x in v if isinstance(x, (int, float))]
    out["fields"][k] = {"n": len(v), "min": min(nums) if nums else None, "max": max(nums) if nums else None, "sample": v[len(v)//2]}
out["sample"] = pos[len(pos)//2]
json.dump(out, open("out/bin_fields.json", "w"), indent=1, default=str)
