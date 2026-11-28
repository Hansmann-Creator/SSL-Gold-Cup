import json, os, io, urllib.request
from PIL import Image
UA = {"User-Agent": "Mozilla/5.0 (compatible; GoldCupApp/1.0)"}
os.makedirs("dl", exist_ok=True)
L = json.load(open("tools/photos/dl.json")); ok = 0
for k, u in L.items():
    try:
        b = urllib.request.urlopen(urllib.request.Request(u, headers=UA), timeout=40).read()
        im = Image.open(io.BytesIO(b)); im.load()
        if im.mode in ("RGBA", "LA", "P"):
            im = im.convert("RGBA"); bg = Image.new("RGBA", im.size, (10, 85, 144, 255)); bg.alpha_composite(im); im = bg
        im = im.convert("RGB"); im.thumbnail((900, 900)); im.save(f"dl/{k}.webp", "WEBP", quality=88); ok += 1
    except Exception as e: print(k, e)
print(ok, "of", len(L))
