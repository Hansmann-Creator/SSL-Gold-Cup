"""Mirror public sailor data from worldofsailors.com (SSL) for the app.

Writes
  rank/ind.json            Men/Women individual rankings (skipper + crew), top N each:
                           {"date", "men": {"s": rows, "c": rows, "ts": total, "tc": total}, "women": {...}}
                           row = [global_pos, points, before_pos, first, last, slug, code_ssl, iso2, img]
  sp/<slug>.json           one file per sailor (Rio squads + top of the rankings), loaded on demand by the app:
                           {"p": summary, "res": {"s": [...], "c": [...]}, "hist": {"s": [[date,pos,pts]], "c": [...]},
                            "ach": [[name, color, [[place, year, class]]]], "rec": [[type, [[year,event,city,country,class,role,rank]]]]}
  profiles.json            roster key "CODE|Name" -> summary (+ fields older app versions read)
Only fields the public profile page shows are kept: no e-mail, phone, date or place of birth.
Runs in GitHub Actions (the site is not reachable from the Claude container).
Usage: python scripts/sailors.py [ranking|profiles|all] [top_n_profiles]
"""
import json, os, re, sys, time, html, unicodedata, urllib.request, threading
from concurrent.futures import ThreadPoolExecutor

ROOT = os.path.join(os.path.dirname(__file__), "..")
UA = {"User-Agent": "Mozilla/5.0 (compatible; GoldCupApp/1.0)"}
W = "https://worldofsailors.com"
IMG = "https://platform.worldofsailors.com/storage/"
SP = os.path.join(ROOT, "sp")


def get(u, tries=3):
    for k in range(tries):
        try:
            with urllib.request.urlopen(urllib.request.Request(u, headers=UA), timeout=60) as r:
                return r.read().decode("utf-8", "replace")
        except urllib.error.HTTPError as e:
            if e.code == 404: return None
            time.sleep(2 + 4 * k)
        except Exception:
            time.sleep(2 + 4 * k)
    return None


def rsc(h):
    out = []
    for p in re.findall(r'self\.__next_f\.push\(\[1,"(.*?)"\]\)</script>', h or "", re.S):
        try: out.append(json.loads('"' + p + '"'))
        except Exception: pass
    return "".join(out)


def ref(s, v):
    """Resolve a React Server Components text reference like "$27" (row 27:T<hexlen>,<text>)."""
    if not (isinstance(v, str) and re.fullmatch(r"\$[0-9a-f]+", v)): return v
    m = re.search(r"(?:^|\n)%s:T([0-9a-f]+)," % v[1:], s)
    if not m: return ""
    b = s[m.end():m.end() + int(m.group(1), 16) + 200].encode("utf-8")[:int(m.group(1), 16)]
    return b.decode("utf-8", "ignore")


def val_at(s, i):
    try: return json.JSONDecoder().raw_decode(s, i)[0]
    except Exception: return None


def obj(s, key, pred=None):
    for m in re.finditer('"%s":' % re.escape(key), s):
        v = val_at(s, m.end())
        if v is not None and (pred is None or pred(v)): return v
    return None


def norm(s):
    s = unicodedata.normalize("NFKD", s or "").encode("ascii", "ignore").decode().lower()
    return re.sub(r"[^a-z ]+", " ", s).split()


def slugify(s):
    return "-".join(norm(s))


def txt(h):
    h = re.sub(r"(?i)<br\s*/?>|</p>\s*<p[^>]*>", "\n", h or "")
    t = html.unescape(re.sub(r"<[^>]+>", "", h))
    return re.sub(r"[ \t]+", " ", re.sub(r"\n\s*\n+", "\n", t)).strip()


def short(d):
    return (d or "")[:10]


# ---------------------------------------------------------------- rankings
def rank_rows(L):
    rows = []
    for x in (L or {}).get("data", []):
        sl = x.get("sailor") or {}; c = sl.get("country") or {}
        img = (sl.get("image") or {}).get("url") or ""
        rows.append([x.get("position"), round(x.get("points") or 0, 2), x.get("before_position"), (sl.get("first_name") or "").strip(),
                     (sl.get("name") or "").strip(), sl.get("username") or "", c.get("code_ssl") or "", (c.get("code") or "").lower(), img])
    return rows


def ranking(pages):
    out = {}
    for g in ("men", "women"):
        S, C, seen_s, seen_c, ts, tc, date = [], [], set(), set(), 0, 0, None
        for p in range(1, pages + 1):
            s = rsc(get(f"{W}/ranking/{g}?page={p}&page_crew={p}"))
            for key, dst, seen in (("rankingSkipper", S, seen_s), ("rankingCrew", C, seen_c)):
                r = obj(s, key, lambda v: isinstance(v, dict) and "lines" in v)
                if not r: continue
                date = r.get("date") or date
                L = r.get("lines") or {}
                if key == "rankingSkipper": ts = L.get("total") or ts
                else: tc = L.get("total") or tc
                for row in rank_rows(L):
                    if row[5] and row[5] not in seen: seen.add(row[5]); dst.append(row)
            time.sleep(0.8)
        S.sort(key=lambda r: r[0] or 1e9); C.sort(key=lambda r: r[0] or 1e9)
        out[g] = {"s": S, "c": C, "ts": ts, "tc": tc}
        out["date"] = date or out.get("date")
    if out.get("men", {}).get("s"):
        os.makedirs(os.path.join(ROOT, "rank"), exist_ok=True)
        json.dump(out, open(os.path.join(ROOT, "rank", "ind.json"), "w", encoding="utf-8"), ensure_ascii=False, separators=(",", ":"))
        print("ranking", out["date"], {g: (len(out[g]["s"]), len(out[g]["c"])) for g in ("men", "women")})
    return out


# ---------------------------------------------------------------- profiles
CLS = {}


def cls_name(i):
    return CLS.get(i) or ""


def profile(slug):
    """Fetch and parse one sailor page. Returns (summary, detail) or None."""
    h = get(f"{W}/sailor/{slug}")
    if not h: return None
    s = rsc(h)
    u = obj(s, "user", lambda v: isinstance(v, dict) and v.get("username") == slug)
    if not u: return None
    for c in obj(s, "competitionClasses", lambda v: isinstance(v, list)) or []:
        if isinstance(c, dict) and c.get("id"): CLS[c["id"]] = c.get("name") or ""
    co = u.get("country") or {}
    p = {"slug": slug, "first": (u.get("first_name") or "").strip(), "last": (u.get("name") or "").strip(),
         "cc": co.get("code_ssl") or "", "iso": (co.get("code") or "").lower(), "country": (co.get("name") or "").title(),
         "g": u.get("gender")}
    img = (u.get("image") or {}).get("url")
    if img: p["img"] = IMG + img
    clubs = [c.get("name") for c in (u.get("clubs") or []) if c.get("name")]
    if clubs: p["club"] = clubs[0]; p["clubs"] = clubs
    if u.get("height"): p["cm"] = u["height"]
    if u.get("weight"): p["kg"] = u["weight"]
    b = txt(ref(s, u.get("biography")))
    if b: p["bio"] = b
    soc = {k: u[k] for k in ("instagram", "facebook", "x", "youtube", "tiktok", "linkedin", "website")
           if isinstance(u.get(k), str) and u[k].startswith("http")}
    if soc: p["soc"] = soc
    # rankings + history
    rk, hist, classes = {}, {}, set()
    for t in u.get("rankings") or []:
        typ = "c" if "crew" in (t.get("type") or "") else "s"
        L = sorted(t.get("ranking") or [], key=lambda x: x.get("date") or "", reverse=True)
        if not L or not (L[0].get("points") or 0) > 0: continue   # not ranked in this role right now
        L = [y for y in L if (y.get("points") or 0) > 0]
        x = L[0]
        rk[typ] = [x.get("position"), round(x.get("points") or 0, 2), x.get("before_position"), x.get("date")]
        try:
            for cid in json.loads(x.get("competition_classes") or "[]"): classes.add(cid)
        except Exception: pass
        best = min((y for y in L if y.get("position")), key=lambda y: y["position"], default=None)
        if best: rk[typ].append([best["position"], best.get("date")])
        hist[typ] = [[y.get("date"), y.get("position"), round(y.get("points") or 0, 1)] for y in reversed(L[:110])]
    if rk: p["rk"] = rk
    # results
    res, allres = {}, []
    for t in u.get("results") or []:
        typ = "c" if "crew" in (t.get("type") or "") else "s"
        rows = []
        for r in t.get("results") or []:
            g = r.get("regatta") or {}; gc = g.get("country") or {}
            rows.append([short(g.get("date_to") or g.get("date_from")), g.get("name") or "", g.get("place") or "", gc.get("code_ssl") or "",
                         r.get("competition_class_name") or "", (r.get("category_name") or "").title(), r.get("position"),
                         g.get("boats"), round(r.get("ssl_points") or 0, 1), r.get("race_count")])
            if r.get("competition_class_id"): classes.add(r["competition_class_id"])
        rows.sort(key=lambda x: x[0], reverse=True)
        res[typ] = rows[:80]; allres += rows
    if allres:
        pos = [x[6] for x in allres if isinstance(x[6], int)]
        p["st"] = {"ev": len(allres), "win": sum(1 for x in pos if x == 1), "pod": sum(1 for x in pos if x <= 3),
                   "avg": round(sum(x[8] for x in allres) / len(allres), 1), "best": min(pos) if pos else None}
    p["cls"] = [n for n in (cls_name(c) for c in sorted(classes)) if n][:6]
    # achievements (medal badges) and records (major results tables)
    ach = []
    ag = obj(s, "achievementsGroup", lambda v: isinstance(v, dict) and "types" in v) or {}
    for t in sorted(ag.get("types") or [], key=lambda x: x.get("position") or 99):
        L = [[a.get("place") or "", short(a.get("received_at"))[:4], cls_name(a.get("competition_class_id"))] for a in t.get("achievements") or []]
        if L: ach.append([t.get("name") or "", t.get("color") or "", L])
    ach = fix_gc_ach(ach, p.get("cc"))
    if ach: p["ach2"] = [[a[0], a[1], len(a[2])] for a in ach]
    rec = []
    rg = obj(s, "recordsGroup", lambda v: isinstance(v, dict) and "types" in v) or {}
    for t in sorted(rg.get("types") or [], key=lambda x: x.get("position") or 99):
        L = []
        for r in t.get("records") or []:
            g = r.get("regatta") or {}; gc = g.get("country") or {}
            L.append([short(r.get("date"))[:4], g.get("name") or r.get("regatta_name") or "", r.get("city") or g.get("place") or "",
                      (gc.get("name") or "").title(), cls_name(r.get("competition_class_id")),
                      "Crew" if "crew" in (r.get("user_role") or "") else "Skipper", r.get("rank")])
        L.sort(key=lambda x: x[0], reverse=True)
        if L: rec.append([t.get("name") or "", L])
    rec = fix_gc_rec(rec)
    if rg.get("total") is not None: p["recn"] = rg.get("total")
    det = {"p": p, "res": res, "hist": hist, "ach": ach, "rec": rec}
    return p, det


GC_YEAR = "2026"          # running edition
GC_END = "2026-12-14"      # day after the Grand Final (13 Dec 2026)


def gc_champion():
    """Gold Cup 2026 winner (team code), set by hand in overrides.json as "gc_champion" after the Grand Final."""
    try: return json.load(open("overrides.json")).get("gc_champion")
    except Exception: return None


def gc_running():
    return time.strftime("%Y-%m-%d", time.gmtime()) < GC_END


def fix_gc_ach(ach, cc=None):
    """worldofsailors.com lists every sailor of a 2026 qualifier team as 'SSL Gold Cup Winner · Rio de Janeiro 2026'
    (also Estonia/Lithuania/Portugal, who qualified in Grandson). That is the Qualifying Series, not the Gold Cup:
    relabel it and drop the place. Only the real champion (overrides.json gc_champion, after the final) keeps 'Winner'.
    Older editions (e.g. 2023) stay untouched."""
    if not gc_running() and cc and cc == gc_champion(): return ach
    out, q = [], []
    for name, color, L in ach:
        if name == "SSL Gold Cup Winner":
            q += [["", e[1], e[2]] for e in L if e[1] == GC_YEAR]
            L = [e for e in L if e[1] != GC_YEAR]
        if L: out.append([name, color, L])
    if q: out.append(["SSL Gold Cup Qualifier", "q", q[:1]])
    return out


def fix_gc_rec(rec):
    """While the Final Series is running, worldofsailors shows an interim 'SSL Gold Cup 2026' rank (1/2/3) –
    not a result. Drop those rows until the Grand Final is over; the qualifier rows stay."""
    if not gc_running(): return rec
    out = []
    for t, L in rec:
        L = [r for r in L if r[1] != "SSL Gold Cup " + GC_YEAR]
        if L: out.append([t, L])
    return out


def name_ok(p, name):
    a = norm(name); b = norm(p["first"] + " " + p["last"])
    if not a or not b: return False
    return a[0] in b and a[-1] in b


def ssl_gc(det):
    return any("SSL" in (r[1] or "") and "Gold Cup" in (r[1] or "") for L in det["res"].values() for r in L)


def legacy(p, det):
    """Fields older app versions read from profiles.json."""
    o = {k: p[k] for k in ("slug", "club", "cm", "kg", "bio", "img", "soc", "cls", "st", "rk", "ach2", "recn") if k in p}
    o["country"] = p.get("country")
    if "s" in p.get("rk", {}): o["rank"], o["pts"] = p["rk"]["s"][0], int(round(p["rk"]["s"][1]))
    elif "c" in p.get("rk", {}): o["rank"], o["pts"] = p["rk"]["c"][0], int(round(p["rk"]["c"][1]))
    if det["ach"]: o["ach"] = [[len(a[2]), a[0]] for a in det["ach"]]
    if det["rec"]: o["rec"] = {t: [[int(r[0] or 0), r[1], r[2], r[3], r[4], r[5], r[6]] for r in L] for t, L in det["rec"]}
    return o


def profiles(top):
    os.makedirs(SP, exist_ok=True)
    RO = json.load(open(os.path.join(ROOT, "roster.json"), encoding="utf-8"))
    TI = json.load(open(os.path.join(ROOT, "teaminfo.json"), encoding="utf-8"))
    try: OLD = json.load(open(os.path.join(ROOT, "profiles.json"), encoding="utf-8"))
    except Exception: OLD = {}
    # names from the nations ranking: (iso2, normalized name) -> slug
    known = {}
    try:
        idx = json.load(open(os.path.join(ROOT, "rank", "index.json")))
        wk = json.load(open(os.path.join(ROOT, "rank", idx["date"] + ".json")))
        for r in wk["n"]:
            for pl in (r[7] or []) + (r[8] or []):
                known[(r[4], " ".join(norm(pl[2] + " " + pl[3])))] = pl[4]
    except Exception as e: print("no nations ranking", e)
    cache, OUT, miss = {}, {}, []
    done = [0]
    lock = threading.Lock()
    t0 = time.time(); budget = float(os.environ.get("SAIL_BUDGET_MIN", "95")) * 60
    retry_all = os.environ.get("SAIL_RETRY_MISS") == "1"
    try: prev_miss = json.load(open(os.path.join(SP, "_miss.json"), encoding="utf-8")).get("seen", {})
    except Exception: prev_miss = {}
    today = time.strftime("%Y-%m-%d")
    seen_miss = {}

    def load(sl):
        with lock:
            if sl in cache: return cache[sl]
        r = profile(sl); time.sleep(0.3)
        with lock: cache[sl] = r
        return r

    def one(code, iso, row):
        name = row[0].strip(); key = f"{code}|{name}"; w = name.split()
        if len(w) < 2: return
        if time.time() - t0 > budget:            # out of time: keep yesterday's entry
            if key in OLD: OUT[key] = OLD[key]
            return
        pm = prev_miss.get(key)
        if not retry_all and pm and pm > time.strftime("%Y-%m-%d", time.gmtime(time.time() - 6 * 86400)) and not OLD.get(key, {}).get("slug"):
            with lock: miss.append(key); seen_miss[key] = pm
            return   # searched in vain this week already
        cands = []
        k = (iso, " ".join(norm(name)))
        if k in known: cands.append(known[k])
        if OLD.get(key, {}).get("slug"): cands.append(OLD[key]["slug"])
        # name orders seen on the team pages: "First Last", "LAST First", doubled first names
        ww = list(dict.fromkeys(w))
        base = list(dict.fromkeys([slugify(name), slugify(" ".join(ww)), slugify(w[0] + " " + w[-1]), slugify(w[0] + " " + " ".join(w[-2:])),
                                   slugify(w[-1] + " " + " ".join(w[:-1])), slugify(w[-1] + " " + w[0]), slugify(" ".join(w[:2]))]))
        cands += base + [b + "-1" for b in base[:4]] + [b + "-2" for b in base[:1]]
        got = None
        for c in dict.fromkeys(cands):
            r = load(c)
            if not r: continue
            p, det = r
            if not name_ok(p, name): continue
            if p["iso"] == iso or ssl_gc(det): got = r; break
        if got:
            p, det = got
            OUT[key] = legacy(p, det)
            with lock: done[0] += 1
            json.dump(det, open(os.path.join(SP, p["slug"] + ".json"), "w", encoding="utf-8"), ensure_ascii=False, separators=(",", ":"))
        else:
            with lock: miss.append(key); seen_miss[key] = today

    jobs = [(code, (TI.get(code) or {}).get("iso", "").lower(), row) for code, t in RO.items() for row in t.get("s", [])]
    with ThreadPoolExecutor(int(os.environ.get("SAIL_THREADS", "6"))) as ex:
        list(ex.map(lambda a: one(*a), jobs))
    done = done[0]
    # top of the individual rankings (pages for sailors outside the Rio squads)
    try: R = json.load(open(os.path.join(ROOT, "rank", "ind.json"), encoding="utf-8"))
    except Exception: R = {}
    xs = []
    for g in ("men", "women"):
        for t in ("s", "c"):
            xs += [r[5] for r in (R.get(g, {}).get(t) or [])[:top]]
    ext = [0]
    def rk1(sl):
        if not sl or time.time() - t0 > budget: return
        r = load(sl)
        if r:
            json.dump(r[1], open(os.path.join(SP, sl + ".json"), "w", encoding="utf-8"), ensure_ascii=False, separators=(",", ":"))
            with lock: ext[0] += 1
    with ThreadPoolExecutor(int(os.environ.get("SAIL_THREADS", "6"))) as ex:
        list(ex.map(rk1, list(dict.fromkeys(xs))))
    ext = ext[0]
    # keep earlier matches the site did not answer this time (temporary errors), drop wrong ones we now reject
    for k, v in OLD.items():
        if k not in OUT and k not in miss and v.get("slug") and cache.get(v["slug"]) is None and os.path.exists(os.path.join(SP, v["slug"] + ".json")):
            OUT[k] = v
    json.dump(OUT, open(os.path.join(ROOT, "profiles.json"), "w", encoding="utf-8"), ensure_ascii=False, separators=(",", ":"), sort_keys=True)
    json.dump({"miss": miss, "seen": seen_miss}, open(os.path.join(SP, "_miss.json"), "w", encoding="utf-8"), ensure_ascii=False, indent=0)
    print(f"profiles: {done} roster sailors matched, {len(miss)} not found, {ext} ranking pages")


if __name__ == "__main__":
    what = sys.argv[1] if len(sys.argv) > 1 else "all"
    top = int(sys.argv[2]) if len(sys.argv) > 2 else 100
    if what in ("ranking", "all"): ranking(5)
    if what in ("profiles", "all"): profiles(top)
