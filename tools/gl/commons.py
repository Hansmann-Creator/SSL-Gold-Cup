"""Free photos for glossary terms from Wikimedia Commons (runs in GitHub Actions).

  python tools/gl/commons.py cand          -> /tmp/glcand/<term>.jpg contact sheets + cand.json (top candidates per term)
  python tools/gl/commons.py get pick.json -> img/gl/<term>.webp (900 px) + school/gl_img.json credits
Only files with a free licence (CC0, public domain, CC BY, CC BY-SA) are used; author + licence + link are kept for attribution.
"""
import io, json, os, re, sys, time, html, urllib.parse, urllib.request
from PIL import Image, ImageDraw, ImageFont

UA = {"User-Agent": "SSLGoldCupCompanion/1.0 (https://hansmann-creator.github.io/SSL-Gold-Cup/; glossary images)"}
ROOT = os.path.join(os.path.dirname(__file__), "..", "..")
Q = {
 "ssl47": "Star Sailors League", "mainsail": "mainsail", "jib": "jib sail", "gennaker": "gennaker", "bowsprit": "bowsprit yacht",
 "keel": "keel bulb", "rudder": "rudder yacht", "boom": "sailboat boom", "winch": "sailing winch", "telltales": "telltales sail",
 "traveller": "mainsheet traveller", "backstay": "backstay", "tack": "tacking yacht", "gybe": "gybing", "broach": "broaching yacht",
 "hoist": "spinnaker hoist", "drop": "spinnaker takedown", "start-line": "regatta start", "committee": "committee boat regatta",
 "windward-mark": "mark rounding", "gate": "regatta buoy", "umpire": "umpire boat", "close-hauled": "close hauled", "run": "spinnaker downwind",
 "sea-breeze": "Guanabara Bay regatta", "current": "Guanabara Bay", "grinder": "grinder winch", "helm": "helmsman yacht",
 "heel": "heeling yacht", "overlap": "yachts racing", "gust": "regatta wind", "halyard": "halyard",
}
FREE = re.compile(r"^(cc0|public domain|pd|cc by(-sa)? [0-9.]+|cc-by(-sa)?-[0-9.]+)", re.I)


def get(u, raw=False):
    for k in range(3):
        try:
            with urllib.request.urlopen(urllib.request.Request(u, headers=UA), timeout=60) as r:
                b = r.read(); return b if raw else json.loads(b.decode())
        except Exception: time.sleep(2 + 3 * k)
    return None


def strip(x): return re.sub(r"\s+", " ", html.unescape(re.sub(r"<[^>]+>", "", x or ""))).strip()


def search(q, n=8):
    p = {"action": "query", "format": "json", "generator": "search", "gsrnamespace": 6, "gsrsearch": q + " filetype:bitmap -map -drawing -diagram", "gsrlimit": 24,
         "prop": "imageinfo", "iiprop": "url|extmetadata|size", "iiurlwidth": 420}
    r = get("https://commons.wikimedia.org/w/api.php?" + urllib.parse.urlencode(p)) or {}
    out = []
    for pg in sorted((r.get("query") or {}).get("pages", {}).values(), key=lambda x: x.get("index", 99)):
        ii = (pg.get("imageinfo") or [{}])[0]; m = ii.get("extmetadata") or {}
        lic = strip((m.get("LicenseShortName") or {}).get("value"))
        if not FREE.search(lic) or ii.get("width", 0) < 800: continue
        out.append({"title": pg["title"], "thumb": ii.get("thumburl"), "url": ii.get("url"), "page": ii.get("descriptionurl"), "lic": lic,
                    "author": strip((m.get("Artist") or {}).get("value"))[:80], "w": ii.get("width"), "h": ii.get("height")})
        if len(out) >= n: break
    return out


def cand():
    os.makedirs("/tmp/glcand", exist_ok=True); C = {}
    try: f = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf", 22)
    except Exception: f = ImageFont.load_default()
    for k, q in Q.items():
        L = search(q); C[k] = L
        sheet = Image.new("RGB", (4 * 420, 2 * 300 + 40), (20, 30, 50)); d = ImageDraw.Draw(sheet); d.text((8, 8), f"{k}: {q}", fill=(255, 210, 31), font=f)
        for i, c in enumerate(L):
            b = get(c["thumb"], raw=True)
            if not b: continue
            try: im = Image.open(io.BytesIO(b)).convert("RGB"); im.thumbnail((410, 260))
            except Exception: continue
            x, y = (i % 4) * 420 + 5, 40 + (i // 4) * 300
            sheet.paste(im, (x, y)); d.text((x + 4, y + 262), f"{i}  {c['lic'][:14]}", fill=(255, 255, 255), font=f)
        sheet.save(f"/tmp/glcand/{k}.jpg", quality=72); time.sleep(0.5)
    json.dump(C, open("/tmp/glcand/cand.json", "w"), ensure_ascii=False, indent=1)


def fetch(pick):
    C = json.load(open(pick)); os.makedirs(os.path.join(ROOT, "img", "gl"), exist_ok=True)
    try: OUT = json.load(open(os.path.join(ROOT, "school", "gl_img.json")))
    except Exception: OUT = {}
    for k, c in C.items():
        u = c["url"]; p = {"action": "query", "format": "json", "titles": c["title"], "prop": "imageinfo", "iiprop": "url|extmetadata", "iiurlwidth": 900}
        r = get("https://commons.wikimedia.org/w/api.php?" + urllib.parse.urlencode(p)) or {}
        pg = next(iter((r.get("query") or {}).get("pages", {}).values()), {}); ii = (pg.get("imageinfo") or [{}])[0]; m = ii.get("extmetadata") or {}
        b = get(ii.get("thumburl") or u, raw=True)
        if not b: print("fail", k); continue
        im = Image.open(io.BytesIO(b)).convert("RGB"); im.thumbnail((900, 900))
        im.save(os.path.join(ROOT, "img", "gl", k + ".webp"), "WEBP", quality=78)
        OUT[k] = {"src": f"img/gl/{k}.webp", "w": im.width, "h": im.height, "lic": strip((m.get("LicenseShortName") or {}).get("value")),
                  "by": strip((m.get("Artist") or {}).get("value"))[:90], "page": ii.get("descriptionurl") or c.get("page"), "t": c["title"].replace("File:", "")}
        print("ok", k, OUT[k]["lic"], OUT[k]["by"])
    json.dump(OUT, open(os.path.join(ROOT, "school", "gl_img.json"), "w"), ensure_ascii=False, indent=1, sort_keys=True)


if __name__ == "__main__":
    cand() if sys.argv[1] == "cand" else fetch(sys.argv[2])
