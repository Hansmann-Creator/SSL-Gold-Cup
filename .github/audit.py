import json, re, os, sys, time, html, urllib.request
sys.path.insert(0, "scripts")
from profiles import text, sections, slug, fetch
RO = json.load(open("roster.json", encoding="utf-8"))
PF = json.load(open("profiles.json", encoding="utf-8"))
out = {"teams": {}, "roles": {}}
for code in RO:
    s = fetch(f"https://{code.lower()}.sslgoldcup.com/")
    out["teams"][code] = text(s) if s else None
    time.sleep(0.2)
for code, t in RO.items():
    for row in t["s"]:
        name = row[0].strip(); key = f"{code}|{name}"
        sl = (PF.get(key) or {}).get("slug")
        cands = [sl] if sl else []
        w = name.split()
        if len(w) >= 2: cands += [slug(name), slug(w[0] + " " + w[-1])]
        for c in dict.fromkeys(cands):
            s = fetch("https://worldofsailors.com/sailor/" + c); time.sleep(0.15)
            if not s: continue
            T = text(s)
            if w and w[-1].lower()[:4] not in T.lower(): continue
            sec = sections(T)
            rows = [r for v in sec.values() for r in v]
            ssl = [r for r in rows if re.search(r"SSL|Gold Cup|Star Sailors", r[1], re.I)]
            out["roles"][key] = {"slug": c, "ssl": ssl, "allroles": sorted({r[5] for r in rows})}
            break
json.dump(out, open("audit.json", "w", encoding="utf-8"), ensure_ascii=False)
print(len(out["roles"]), "profiles;", sum(1 for v in out["teams"].values() if v), "team pages")
