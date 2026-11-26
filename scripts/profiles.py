"""Collect public facts from the SSL sailor profiles (worldofsailors.com) for every sailor in roster.json.

Writes profiles.json: { "TAH|Teva Plichart": {"slug":..., "rank":..., "club":..., "ach":[[n,label]], "oly":[[year,city,class,rank]],
"wc":[[year,class,rank]], "ec":[[year,class,rank]]} }. Only facts (titles, results, club) – the free-text biographies are
not copied; the app links to the profile instead.
"""
import json, re, os, time, html, unicodedata, urllib.request, urllib.error

ROOT = os.path.join(os.path.dirname(__file__), "..")
UA = {"User-Agent": "Mozilla/5.0 (compatible; GoldCupApp/1.0)"}

def slug(s):
    s = unicodedata.normalize("NFKD", s).encode("ascii", "ignore").decode()
    return re.sub(r"[^a-z0-9]+", "-", s.lower()).strip("-")

def fetch(u):
    try:
        with urllib.request.urlopen(urllib.request.Request(u, headers=UA), timeout=25) as r:
            return r.read().decode("utf-8", "replace")
    except Exception:
        return None

def text(s):
    s = re.sub(r"<script.*?</script>|<style.*?</style>|<svg.*?</svg>", "", s, flags=re.S)
    t = html.unescape(re.sub(r"\s+", " ", re.sub(r"<[^>]+>", "|", s)))
    return re.sub(r"(\s*\|\s*)+", "|", t)

ROW = re.compile(r"\|(\d{4})\|([^|]+)\|([^|]*)\|,\|([^|]+)\|([^|]+)\|([^|]+)\|(\d+)(?=\|)")

def section(t, a, b):
    i = t.find("|" + a + "|DATE|")
    if i < 0: return []
    j = min([k for k in (t.find("|" + x + "|", i + 5) for x in b) if k > 0] or [len(t)])
    return [m.groups() for m in ROW.finditer(t[i:j] + "|")]

def parse(t, first, last):
    # the profile header shows first and last name as separate fields
    if first.lower() not in t.lower() or last.lower() not in t.lower():
        return None
    out = {}
    m = re.search(r"\|Rank\|(\d+)\|", t)
    if m: out["rank"] = int(m.group(1))
    h = t[t.find("|Rank|"):t.find("|Country|")] if "|Country|" in t else ""
    ach = [[int(n), lab.strip()] for n, lab in re.findall(r"\|(\d+)\|X\|([^|]{3,60})(?=\|)", h)]
    if ach: out["ach"] = ach
    m = re.search(r"\|Club\|([^|]{2,80})\|", t)
    if m and not m.group(1).strip().startswith(("Height", "Weight")): out["club"] = m.group(1).strip()
    oly = section(t, "Olympic Games", ["World Championship", "Continental Championship", "Statistics"])
    if oly: out["oly"] = [[int(y), c.strip(), cl.strip(), int(r)] for y, ev, c, co, cl, ro, r in oly][:8]
    wc = section(t, "World Championship", ["Continental Championship", "Statistics"])
    if wc: out["wc"] = sorted([[int(y), cl.strip(), int(r)] for y, ev, c, co, cl, ro, r in wc if int(r) <= 3], key=lambda x: (-x[0]))[:6]
    ec = section(t, "Continental Championship", ["Statistics"])
    if ec: out["ec"] = sorted([[int(y), cl.strip(), int(r)] for y, ev, c, co, cl, ro, r in ec if int(r) <= 3], key=lambda x: (-x[0]))[:4]
    out["bio"] = "|Bio|" in t
    return out

def main():
    RO = json.load(open(os.path.join(ROOT, "roster.json"), encoding="utf-8"))
    path = os.path.join(ROOT, "profiles.json")
    try: OUT = json.load(open(path, encoding="utf-8"))
    except Exception: OUT = {}
    found = tried = 0
    for code, t in RO.items():
        for row in t.get("s", []):
            name = row[0].strip()
            key = f"{code}|{name}"
            w = name.split()
            if len(w) < 2: continue
            cands = list(dict.fromkeys([slug(name), slug(w[0] + " " + w[-1]), slug(w[0] + " " + " ".join(w[-2:]))]))
            tried += 1
            for c in cands:
                s = fetch("https://worldofsailors.com/sailor/" + c)
                time.sleep(0.15)
                if not s: continue
                p = parse(text(s), w[0], w[-1])
                if p is not None:
                    p["slug"] = c; OUT[key] = p; found += 1; break
    json.dump(OUT, open(path, "w", encoding="utf-8"), ensure_ascii=False, separators=(",", ":"), sort_keys=True)
    print(f"profiles: {found} of {tried} sailors found")

if __name__ == "__main__":
    main()
