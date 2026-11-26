"""Collect public facts from the SSL sailor profiles (worldofsailors.com) for every sailor in roster.json.

Writes profiles.json: { "TAH|Teva Plichart": {"slug":..., "rank":..., "club":..., "ach":[[n,label]], "oly":[[year,city,class,rank]],
"wc":[[year,class,rank]], "ec":[[year,class,rank]]} }. Includes the short official bio, shown in the app with the SSL as source.
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
HDR = re.compile(r"\|([^|]{3,60})\|DATE\|EVENT\|CLASS\|ROLE\|RANK\|")

def sections(t):
    """All result tables of the profile: {title: [[year, event, city, country, class, role, rank], ...]}"""
    hs = list(HDR.finditer(t)); out = {}
    for k, m in enumerate(hs):
        j = hs[k + 1].start() if k + 1 < len(hs) else (t.find("|Statistics|", m.end()) if t.find("|Statistics|", m.end()) > 0 else len(t))
        rows = [[int(y), ev.strip(), c.strip(), co.strip().title(), cl.strip(), ro.strip(), int(r)]
                for y, ev, c, co, cl, ro, r in (g.groups() for g in ROW.finditer(t[m.start():j] + "|"))]
        if rows: out[m.group(1).strip()] = rows
    return out

def parse(t, first, last):
    # the profile header shows first and last name as separate fields
    if first.lower() not in t.lower() or last.lower() not in t.lower():
        return None
    out = {}
    m = re.search(r"\|Rank\|(\d+)\|", t)
    if m: out["rank"] = int(m.group(1))
    m = re.search(r"\|SSL Points\|((?:\d\|)+?)(?=\d+\|X\||Country\|)", t)
    if m: out["pts"] = int("".join(m.group(1).split("|")) or 0)
    h = t[t.find("|Rank|"):t.find("|Country|") + 1] if "|Country|" in t else ""
    ach = [[int(n), lab.strip()] for n, lab in re.findall(r"\|(\d+)\|X\|([^|]{3,60})(?=\|)", h)]
    if ach: out["ach"] = ach
    m = re.search(r"\|Country\|([^|]{2,60})\|", t)
    if m and m.group(1).strip() not in ("Club", "Height"): out["country"] = m.group(1).strip().title()
    m = re.search(r"\|Club\|([^|]{2,80})\|", t)
    if m and not m.group(1).strip().startswith(("Height", "Weight", "Bio")): out["club"] = m.group(1).strip()
    m = re.search(r"\|Height\|(\d{2,3})\|cm\|", t)
    if m: out["cm"] = int(m.group(1))
    m = re.search(r"\|Weight\|(\d{2,3})\|kg\|", t)
    if m: out["kg"] = int(m.group(1))
    m = re.search(r"\|Bio\|(.{20,2500}?)\|(?:Records and Statistics|Statistics)\|", t)
    if m: out["bio"] = m.group(1).replace("|", " ").strip()
    sec = sections(t)
    if sec: out["rec"] = sec
    # compact lists kept for older app versions
    oly = sec.get("Olympic Games", [])
    if oly: out["oly"] = [[r[0], r[2], r[4], r[6]] for r in oly][:8]
    wc = sec.get("World Championship", [])
    if wc: out["wc"] = sorted([[r[0], r[4], r[6]] for r in wc if r[6] <= 3], key=lambda x: -x[0])[:6]
    ec = sec.get("Continental Championship", [])
    if ec: out["ec"] = sorted([[r[0], r[4], r[6]] for r in ec if r[6] <= 3], key=lambda x: -x[0])[:4]
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
