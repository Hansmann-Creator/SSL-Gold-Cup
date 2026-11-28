"""Temporary probe (run in Actions): mirror official SSL platform portraits and look for missing ones.
Writes probe/ : img/<CODE-i>.webp (600 px), team/<code>.html, wos/<CODE-i>.json"""
import json, os, re, sys, time, hashlib, io, urllib.request
sys.path.insert(0, "scripts")
from profiles import slug, fetch, text
from PIL import Image
UA = {"User-Agent": "Mozilla/5.0 (compatible; GoldCupApp/1.0)"}
T = json.load(open("tools/photos/targets.json", encoding="utf-8"))
os.makedirs("probe/img", exist_ok=True); os.makedirs("probe/team", exist_ok=True); os.makedirs("probe/wos", exist_ok=True)
def getb(u):
    try:
        with urllib.request.urlopen(urllib.request.Request(u, headers=UA), timeout=30) as r: return r.read()
    except Exception as e: return None
def save_img(u, path):
    b = getb(u)
    if not b: return False
    try:
        im = Image.open(io.BytesIO(b)).convert("RGB"); w, h = im.size; s = min(w, h)
        im = im.crop(((w - s) // 2, max(0, (h - s) // 2 - s // 10) if h > w else 0, (w - s) // 2 + s, (max(0, (h - s) // 2 - s // 10) if h > w else 0) + s))
        im.resize((600, 600), Image.LANCZOS).save(path, "WEBP", quality=84); return True
    except Exception: return False
log = {"plat": 0, "team": 0, "wos": 0}
# 1) team pages
codes = sorted({t["k"].split("-")[0] for t in T})
for c in codes:
    s = fetch(f"https://{c.lower()}.sslgoldcup.com/")
    if s:
        open(f"probe/team/{c}.html", "w", encoding="utf-8").write(s); log["team"] += 1
        for sub in sorted(set(re.findall(r'href="(https?://%s\.sslgoldcup\.com/[^"#?]+)"' % c.lower(), s)))[:12]:
            ss = fetch(sub)
            if ss: open(f"probe/team/{c}__{slug(sub.split('.com/')[1]) or 'x'}.html", "w", encoding="utf-8").write(ss)
            time.sleep(0.1)
    time.sleep(0.2)
# 2) platform portraits already known
for t in T:
    if t["img"] and t["img"].startswith("http"):
        if save_img(t["img"], f"probe/img/{t['k']}.webp"): log["plat"] += 1
# 3) sailors without photo/profile: try worldofsailors slugs
for t in T:
    if t["img"] and t["prof"]: continue
    w = t["name"].split(); cands = []
    if t["prof"]: cands.append(t["prof"].rstrip("/").split("/")[-1])
    if len(w) >= 2:
        cands += [slug(t["name"]), slug(w[0] + " " + w[-1]), slug(w[-1] + " " + w[0])]
        if len(w) >= 3: cands += [slug(w[0] + " " + w[1]), slug(" ".join(w[:2] + w[-1:]))]
    cands = [x for x in dict.fromkeys(cands) if x]
    cands += [x + "-1" for x in cands[:2]]
    for c in cands:
        s = fetch("https://worldofsailors.com/sailor/" + c); time.sleep(0.15)
        if not s: continue
        tx = text(s)
        if w[-1].lower()[:4] not in tx.lower(): continue
        og = re.findall(r'<meta[^>]+property="og:image"[^>]+content="([^"]+)"', s)
        ups = sorted(set(re.findall(r'https://platform\.worldofsailors\.com/storage/uploads/[^"\')\s]+\.(?:webp|jpe?g|png)', s)))
        json.dump({"slug": c, "og": og, "ups": ups, "text": tx[:6000]}, open(f"probe/wos/{t['k']}.json", "w", encoding="utf-8"), ensure_ascii=False)
        log["wos"] += 1
        if not t["img"]:
            pick = [u for u in ups if "default" not in u.split("/uploads/")[1][:8] or True]
            if pick and save_img(pick[0], f"probe/img/{t['k']}__wos.webp"): pass
        break
json.dump(log, open("probe/log.json", "w")); print(log)
