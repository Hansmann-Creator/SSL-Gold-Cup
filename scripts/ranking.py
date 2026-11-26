"""Mirror the SSL Nations Ranking (worldofsailors.com/ranking/nation) into rank/.

Writes
  rank/index.json      {"date": newest week, "weeks": [...], "continents": [{"id","slug","name"}]}
  rank/<YYYY-MM-DD>.json  {"date", "n": [[pos, pts, before_pos, code_ssl, iso2, name, continent_id, skippers, crews], ...]}
      skippers/crews: [[global_pos, points, first, last, slug, img_path], ...]
  img/fl/<iso2>.svg    flags that the app does not have yet
Only public ranking fields are kept (no e-mail, phone or other account data).
Runs in GitHub Actions (the site is not reachable from the Claude container). Usage: python scripts/ranking.py [max_new_weeks]
"""
import json, os, re, sys, time, urllib.request

ROOT = os.path.join(os.path.dirname(__file__), "..")
OUT = os.path.join(ROOT, "rank")
UA = {"User-Agent": "Mozilla/5.0 (compatible; GoldCupApp/1.0)"}
BASE = "https://worldofsailors.com/ranking/nation"

def get(u, tries=3):
    for k in range(tries):
        try:
            with urllib.request.urlopen(urllib.request.Request(u, headers=UA), timeout=60) as r:
                return r.read().decode("utf-8", "replace")
        except Exception as e:
            print("retry", u, e); time.sleep(3 + 5 * k)
    return None

def rsc(html):
    parts = re.findall(r'self\.__next_f\.push\(\[1,"(.*?)"\]\)</script>', html, re.S)
    return "".join(json.loads('"' + p + '"') for p in parts)

def obj_at(s, key):
    """Parse the JSON value that follows "key": in the decoded RSC stream."""
    i = s.find('"%s":' % key)
    if i < 0: return None
    try: return json.JSONDecoder().raw_decode(s, i + len(key) + 3)[0]
    except Exception: return None

def people(L):
    out = []
    for x in L or []:
        sl = x.get("sailor") or {}
        img = (sl.get("image") or {}).get("url") or ""
        out.append([x.get("position"), x.get("points"), (sl.get("first_name") or "").strip(), (sl.get("name") or "").strip(), sl.get("username") or "", img])
    return out

def week(html):
    s = rsc(html)
    rn = obj_at(s, "rankingNation")
    if not rn: return None, s
    rows = []
    for l in (rn.get("lines") or {}).get("data", []):
        c = l.get("country") or {}
        rows.append([l.get("position"), l.get("points"), l.get("before_position"), c.get("code_ssl"), (c.get("code") or "").lower(),
                     c.get("name"), c.get("continent_id"), people(l.get("skippers")), people(l.get("crews"))])
    rows.sort(key=lambda r: (r[0] is None, r[0] or 0))
    return {"date": rn.get("date"), "n": rows}, s

def main():
    max_new = int(sys.argv[1]) if len(sys.argv) > 1 else 200
    os.makedirs(OUT, exist_ok=True)
    html = get(BASE)
    if not html: print("ranking page not reachable"); return
    cur, s = week(html)
    if not cur: print("no ranking data found"); return
    upd = obj_at(s, "updateInformation") or {}
    weeks = list(upd.get("weeks") or [])
    limit = obj_at(s, "rankingDateLimit") or "2025-01-01"
    weeks = [w for w in weeks if w > limit]
    conts = [{"id": c.get("id"), "slug": c.get("slug"), "name": c.get("name")} for c in (obj_at(s, "continents") or [])]
    json.dump(cur, open(os.path.join(OUT, cur["date"] + ".json"), "w", encoding="utf-8"), ensure_ascii=False, separators=(",", ":"))
    new = 0
    for w in weeks:
        p = os.path.join(OUT, w + ".json")
        if os.path.exists(p) or w == cur["date"] or new >= max_new: continue
        h = get(BASE + "?date=" + w)
        d, _ = week(h) if h else (None, None)
        if d and d["n"]:
            d["date"] = w
            json.dump(d, open(p, "w", encoding="utf-8"), ensure_ascii=False, separators=(",", ":")); new += 1
        time.sleep(1.0)
    have = sorted([f[:-5] for f in os.listdir(OUT) if re.match(r"\d{4}-\d\d-\d\d\.json$", f)], reverse=True)
    json.dump({"date": cur["date"], "weeks": have, "continents": conts}, open(os.path.join(OUT, "index.json"), "w", encoding="utf-8"),
              ensure_ascii=False, separators=(",", ":"))
    fl = os.path.join(ROOT, "img", "fl")
    for r in cur["n"]:
        iso = r[4]
        if iso and not os.path.exists(os.path.join(fl, iso + ".webp")) and not os.path.exists(os.path.join(fl, iso + ".svg")):
            svg = get("https://worldofsailors.com/flags/4x3/%s.svg" % iso)
            if svg and svg.lstrip().startswith("<"): open(os.path.join(fl, iso + ".svg"), "w", encoding="utf-8").write(svg)
    print(f"ranking {cur['date']}: {len(cur['n'])} nations, {len(have)} weeks stored, {new} new")

if __name__ == "__main__":
    main()
