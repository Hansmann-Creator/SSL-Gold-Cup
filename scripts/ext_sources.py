"""Facts about the Rio sailors from free, open sources (runs in GitHub Actions).

Sources
  Wikidata      (CC0)        identity check, Olympic participations, medals/awards, external IDs
  Wikipedia     (CC BY-SA)   short intro paragraph per language the app supports (shown with attribution + link)
  Olympedia     (facts)      Olympic sailing results table (Games, event, place)

A sailor is only matched when the Wikidata item is a human, has sailing as sport (or "sailor" as occupation/description)
and the name tokens fit; when the country does not fit too, the match is dropped. No birth data, no private data.

Writes ext.json: {"CODE|Name": {"q": Qid, "wp": {lang: [title, extract, url]}, "ol": [[year, games, event, place, medal]],
                                  "aw": [[label, year]], "ln": [[label, url]]}}
Usage: python scripts/ext_sources.py [limit]
"""
import json, os, re, sys, time, unicodedata, urllib.parse, urllib.request, html
from concurrent.futures import ThreadPoolExecutor

ROOT = os.path.join(os.path.dirname(__file__), "..")
UA = {"User-Agent": "SSLGoldCupCompanion/1.0 (https://hansmann-creator.github.io/SSL-Gold-Cup/; unofficial fan app)"}
LANGS = ["en", "de", "fr", "es", "pt", "it", "zh", "ar", "hi", "bn", "ur", "id", "ms", "ja", "th", "hu", "cs", "uk", "pl"]
SAILING = "Q117850"
SAILOR_OCC = {"Q476246", "Q13382533", "Q1414812"}   # sailor, sport sailor, (regatta) sailor variants


def get(u, js=True, tries=3):
    for k in range(tries):
        try:
            with urllib.request.urlopen(urllib.request.Request(u, headers=UA), timeout=40) as r:
                b = r.read().decode("utf-8", "replace")
                return json.loads(b) if js else b
        except urllib.error.HTTPError as e:
            if e.code == 404: return None
            time.sleep(2 + 3 * k)
        except Exception:
            time.sleep(2 + 3 * k)
    return None


def wd(params):
    params = dict(params, format="json")
    return get("https://www.wikidata.org/w/api.php?" + urllib.parse.urlencode(params)) or {}


def norm(s):
    s = unicodedata.normalize("NFKD", s or "").encode("ascii", "ignore").decode().lower()
    return re.sub(r"[^a-z ]+", " ", s).split()


def name_fit(name, label):
    a, b = norm(name), norm(label)
    if not a or not b: return False
    first, last = a[0], a[-1]
    return (first in b and last in b) or (a[-1] in b and a[0] in b)


def claims(e, p):
    return e.get("claims", {}).get(p, [])


def qids(e, p):
    out = []
    for c in claims(e, p):
        v = (c.get("mainsnak", {}).get("datavalue") or {}).get("value")
        if isinstance(v, dict) and v.get("id"): out.append(v["id"])
    return out


def year_of(c):
    for q in ("P585", "P580", "P582"):
        for s in (c.get("qualifiers") or {}).get(q, []):
            t = ((s.get("datavalue") or {}).get("value") or {}).get("time")
            if t: return t[1:5]
    return ""


LABELS = {}


def labels(ids):
    ids = [i for i in dict.fromkeys(ids) if i and i not in LABELS]
    for k in range(0, len(ids), 45):
        r = wd({"action": "wbgetentities", "ids": "|".join(ids[k:k + 45]), "props": "labels", "languages": "en"})
        for i, e in (r.get("entities") or {}).items():
            LABELS[i] = ((e.get("labels") or {}).get("en") or {}).get("value") or i


def country_qids():
    """iso2 -> Wikidata country item (and a few sporting nations that sail for a territory)."""
    q = 'SELECT ?c ?iso WHERE { ?c wdt:P297 ?iso }'
    r = get("https://query.wikidata.org/sparql?format=json&query=" + urllib.parse.quote(q))
    m = {}
    for b in (r or {}).get("results", {}).get("bindings", []):
        m.setdefault(b["iso"]["value"].lower(), set()).add(b["c"]["value"].rsplit("/", 1)[1])
    return m


def find(name, iso, cq):
    """Return the Wikidata entity for a sailor or None."""
    w = name.split()
    tries = list(dict.fromkeys([name, " ".join(w[::-1]) if len(w) == 2 else name, w[0] + " " + w[-1], w[-1] + " " + w[0]]))
    seen = []
    for t in tries:
        r = wd({"action": "wbsearchentities", "search": t, "language": "en", "type": "item", "limit": 12})
        for x in r.get("search") or []:
            if x["id"] not in seen: seen.append(x["id"])
    if not seen: return None
    r = wd({"action": "wbgetentities", "ids": "|".join(seen[:40]), "props": "claims|sitelinks|labels|descriptions"})
    best = None
    for i, e in (r.get("entities") or {}).items():
        if "Q5" not in qids(e, "P31"): continue
        lab = " ".join(v.get("value", "") for v in (e.get("labels") or {}).values())
        if not name_fit(name, lab): continue
        desc = " ".join(v.get("value", "") for v in (e.get("descriptions") or {}).values()).lower()
        sail = SAILING in qids(e, "P641") or bool(SAILOR_OCC & set(qids(e, "P106"))) or "sailor" in desc or "segler" in desc or "velejador" in desc or "regatista" in desc
        if not sail: continue
        cs = set(qids(e, "P27")) | set(qids(e, "P1532"))
        okc = bool(cs & cq.get(iso, set())) if iso else False
        if not okc and cs: continue           # sailing person of another nation – not ours
        score = (2 if okc else 0) + (1 if SAILING in qids(e, "P641") else 0) + len(e.get("sitelinks") or {}) / 100
        if not best or score > best[0]: best = (score, i, e)
    return best and best[1:]


def wiki(e):
    out = {}
    sl = e.get("sitelinks") or {}
    for L in LANGS:
        s = sl.get(L.replace("-", "_") + "wiki")
        if not s: continue
        t = s["title"]
        r = get(f"https://{L}.wikipedia.org/api/rest_v1/page/summary/" + urllib.parse.quote(t.replace(" ", "_"), safe=""))
        if not r or r.get("type") == "disambiguation": continue
        x = no_birth((r.get("extract") or "").strip())
        if len(x) < 40: continue
        u = ((r.get("content_urls") or {}).get("mobile") or {}).get("page") or f"https://{L}.wikipedia.org/wiki/" + urllib.parse.quote(t.replace(" ", "_"))
        out[L] = [t, x[:900], u]
        time.sleep(0.2)
    return out


def olympedia(oid):
    h = get(f"https://www.olympedia.org/athletes/{oid}", js=False)
    if not h: return []
    clean = lambda x: re.sub(r"\s+", " ", html.unescape(re.sub(r"<[^>]+>", " ", x))).strip()
    for tb in re.findall(r"<table[^>]*>(.*?)</table>", h, re.S):
        hd = [clean(x).lower() for x in re.findall(r"<th[^>]*>(.*?)</th>", tb, re.S)]
        if not hd or "games" not in hd[0]: continue
        ix = lambda *ks: next((i for i, x in enumerate(hd) if any(k in x for k in ks)), None)
        iev, ipos, imed = ix("discipline", "event"), ix("pos"), ix("medal")
        rows, games = [], ""
        for tr in re.findall(r"<tr[^>]*>(.*?)</tr>", tb, re.S):
            td = [clean(x) for x in re.findall(r"<td[^>]*>(.*?)</td>", tr, re.S)]
            if len(td) < len(hd) - 1: continue
            if td[0]: games = td[0]; continue          # sport row: "2004 Summer Olympics | Sailing | UKR"
            if not games or iev is None: continue
            ev = re.sub(r"\s*\((Olympic|non-Olympic)\)", "", td[iev]).strip()
            pos = td[ipos] if ipos is not None and ipos < len(td) else ""
            med = td[imed] if imed is not None and imed < len(td) else ""
            yr = (re.search(r"(19|20)\d\d", games) or [""])[0]
            rows.append([yr, games, ev, pos, med])
        if rows: return rows[:24]
    return []


BIRTH = re.compile(r"\b(born|geboren|née?|nacid[oa]|nascid[oa]|nat[oa]|lahir|dilahirkan|született|narozen[áa]?|urodzon[ya]|народив(ся|ся|лася))\b|出生|生まれ|ولد|وُلد|ولدت|जन्म|জন্ম|پیدا|เกิด|\*\s*\d", re.I)


def no_birth(x):
    """Wikipedia intros start with birth dates/places – drop them (the app keeps no birth data)."""
    x = re.sub(r"\s*[\(（][^()（）]*\d{4}[^()（）]*[\)）]", "", x)
    parts = re.split(r"(?<=[.!?。！？])\s*", x)
    return " ".join(p for p in parts if p and not BIRTH.search(p)).strip()


def main():
    lim = int(sys.argv[1]) if len(sys.argv) > 1 else 0
    RO = json.load(open(os.path.join(ROOT, "roster.json"), encoding="utf-8"))
    TI = json.load(open(os.path.join(ROOT, "teaminfo.json"), encoding="utf-8"))
    try: OLD = json.load(open(os.path.join(ROOT, "ext.json"), encoding="utf-8"))
    except Exception: OLD = {}
    cq = country_qids()
    print("countries", len(cq))
    jobs = [(c, (TI.get(c) or {}).get("iso", "").lower(), row[0].strip()) for c, t in RO.items() for row in t.get("s", []) if len(row[0].split()) >= 2]
    if lim: jobs = jobs[:lim]
    OUT, log = {}, []

    def one(a):
        code, iso, name = a
        key = f"{code}|{name}"
        try:
            f = find(name, iso, cq)
        except Exception as ex:
            log.append(f"ERR {key} {ex}"); f = None
        if not f:
            if key in OLD and OLD[key].get("keep"): OUT[key] = OLD[key]
            return
        qid, e = f
        o = {"q": qid}
        try: o["wp"] = wiki(e)
        except Exception as ex: log.append(f"wp {key} {ex}")
        aw = [(v, year_of(c)) for c in claims(e, "P166") for v in [((c.get("mainsnak", {}).get("datavalue") or {}).get("value") or {}).get("id")] if v]
        pi = [(v, year_of(c)) for c in claims(e, "P1344") for v in [((c.get("mainsnak", {}).get("datavalue") or {}).get("value") or {}).get("id")] if v]
        o["_aw"], o["_pi"] = aw, pi
        ext = {}
        for p, cl in (e.get("claims") or {}).items():
            for c in cl:
                if c.get("mainsnak", {}).get("datatype") == "external-id":
                    v = (c.get("mainsnak", {}).get("datavalue") or {}).get("value")
                    if isinstance(v, str): ext.setdefault(p, v)
        o["_ext"] = ext
        if "P8286" in ext:
            try: o["ol"] = olympedia(ext["P8286"])
            except Exception as ex: log.append(f"oly {key} {ex}")
        OUT[key] = o
        log.append(f"OK {key} -> {qid} {(e.get('labels') or {}).get('en', {}).get('value', '')} wp={list(o.get('wp', {}))} ol={len(o.get('ol', []))}")

    with ThreadPoolExecutor(4) as ex:
        list(ex.map(one, jobs))
    # labels for awards / participations, formatter URLs for external IDs
    labels([v for o in OUT.values() for v, _ in o.get("_aw", []) + o.get("_pi", [])])
    props = sorted({p for o in OUT.values() for p in o.get("_ext", {})})
    fmt = {}
    for k in range(0, len(props), 45):
        r = wd({"action": "wbgetentities", "ids": "|".join(props[k:k + 45]), "props": "labels|claims", "languages": "en"})
        for p, e in (r.get("entities") or {}).items():
            lab = ((e.get("labels") or {}).get("en") or {}).get("value") or p
            f = None
            for c in claims(e, "P1630"):
                f = (c.get("mainsnak", {}).get("datavalue") or {}).get("value"); break
            fmt[p] = (lab, f)
    KEEP = re.compile(r"World Sailing|Olympedia|Olympics\.com|Olympic|sailing|Sports-Reference|Team USA|ESPN|Instagram", re.I)
    for o in OUT.values():
        aw = o.pop("_aw", []); pi = o.pop("_pi", []); ext = o.pop("_ext", {})
        o["aw"] = sorted({(LABELS.get(v, v), y) for v, y in aw}, key=lambda x: (x[1] or "0000"), reverse=True)
        o["pi"] = sorted({(LABELS.get(v, v), y) for v, y in pi if re.search(r"sailing|olympic|world|championship|cup|regatta|games", LABELS.get(v, ""), re.I)}, key=lambda x: (x[1] or x[0]), reverse=True)[:25]
        o["ln"] = [[re.sub(r"\s*(people |athlete |sailor )?ID.*$", "", fmt[p][0]).strip(), fmt[p][1].replace("$1", urllib.parse.quote(v, safe=""))] for p, v in ext.items()
                   if p in fmt and fmt[p][1] and KEEP.search(fmt[p][0]) and not re.search(r"Instagram|archived|Sports-Reference|member ID", fmt[p][0])]
        for k in ("aw", "pi", "ln", "ol", "wp"):
            if not o.get(k): o.pop(k, None)
    json.dump(OUT, open(os.path.join(ROOT, "ext.json"), "w", encoding="utf-8"), ensure_ascii=False, separators=(",", ":"), sort_keys=True)
    print("\n".join(sorted(log)))
    print(f"ext: {len(OUT)} of {len(jobs)} sailors matched")


if __name__ == "__main__":
    main()
