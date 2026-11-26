#!/usr/bin/env python3
"""Build-time extras for the Pages site (never committed):
- races.ics and cal/<TEAM>.ics: calendar feeds from the official schedule + current groups
- tracking.json: Georacing race links per round/group/race (best effort)
"""
import json, os, re, datetime, urllib.request

ROOT = os.path.join(os.path.dirname(__file__), "..")
R = json.load(open(os.path.join(ROOT, "results.json"), encoding="utf-8"))
ROT = [["A","B","C","D"],["D","A","B","C"],["C","D","A","B"],["B","C","D","A"]]
T4 = ["12:00","13:10","14:30","16:00"]
T32 = [["12:00","13:20","14:40","16:00"],["11:00","12:20","13:40","15:00"],["12:00","13:20","14:40","16:00"],["12:00","13:20","14:40","16:00"]]
DAYS = {"r32":["2026-11-19","2026-11-20","2026-11-21","2026-11-22"],"r16":["2026-11-26","2026-11-27","2026-11-28","2026-11-29"],
        "r8":["2026-12-02","2026-12-03","2026-12-04","2026-12-05"],"r4":["2026-12-07","2026-12-08","2026-12-09","2026-12-10"]}
SCH = []
try: SOV = json.load(open(os.path.join(ROOT, "sched.json"), encoding="utf-8")).get("days", {})
except Exception: SOV = {}
for rid, ds in DAYS.items():
    for i, d in enumerate(ds):
        if d in SOV: continue
        for j, g in enumerate(ROT[i]):
            SCH.append(dict(rid=rid, d=d, t=(T32[i] if rid == "r32" else T4)[j], g=g, n=i + 1))
for d, L in SOV.items():
    SCH += [dict(rid=e["rid"], d=d, t=e["t"], g=e["g"], n=e["n"]) for e in L]
SCH += [dict(rid="sf", d="2026-12-12", t="12:00", g="A", n=1), dict(rid="sf", d="2026-12-12", t="13:10", g="B", n=1),
        dict(rid="pf", d="2026-12-13", t="12:00", g="A", n=1), dict(rid="f", d="2026-12-13", t="13:10", g="A", n=1)]
NAME = {r["id"]: r["name"] for r in R["rounds"]}
PH = re.compile(r"^(R1|R2|EF|QF|SF)([A-D])(\d)$")


def teams_of(rid, gid):
    r = next((x for x in R["rounds"] if x["id"] == rid), None)
    g = r and next((x for x in r["groups"] if x["id"] == gid), None)
    return [x["team"] for x in g["rows"]] if g else []


def ics_event(x, prefix=""):
    st = datetime.datetime.fromisoformat(f"{x['d']}T{x['t']}:00-03:00").astimezone(datetime.timezone.utc)
    en = st + datetime.timedelta(minutes=50)
    tm = teams_of(x["rid"], x["g"])
    shown = " · ".join(t if not PH.match(t) else "TBC" for t in tm)
    title = NAME.get(x["rid"], x["rid"]) + ("" if x["rid"] in ("pf", "f") else f" · Group {x['g']} · Race {x['n']}")
    f = "%Y%m%dT%H%M%SZ"
    return "\r\n".join(["BEGIN:VEVENT", f"UID:gc26-{x['rid']}-{x['g']}-{x['n']}{('-' + prefix) if prefix else ''}@ssl-gold-cup",
                        f"DTSTAMP:{datetime.datetime.now(datetime.timezone.utc).strftime(f)}", f"DTSTART:{st.strftime(f)}", f"DTEND:{en.strftime(f)}",
                        f"SUMMARY:{(prefix + ': ') if prefix else ''}{title}", f"DESCRIPTION:{shown}\\nSSL Gold Cup Rio 2026 – times are official start times (Rio)",
                        "LOCATION:Marina da Glória\\, Rio de Janeiro", "END:VEVENT"])


def ics(name, events):
    return "\r\n".join(["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//SSL Gold Cup Matchboard//EN", "CALSCALE:GREGORIAN", "METHOD:PUBLISH",
                        f"X-WR-CALNAME:{name}", "X-WR-TIMEZONE:America/Sao_Paulo", "REFRESH-INTERVAL;VALUE=DURATION:PT2H", "X-PUBLISHED-TTL:PT2H"] + events + ["END:VCALENDAR", ""])


def build_ics():
    open(os.path.join(ROOT, "races.ics"), "w", encoding="utf-8", newline="").write(ics("SSL Gold Cup Rio 2026", [ics_event(x) for x in SCH]))
    os.makedirs(os.path.join(ROOT, "cal"), exist_ok=True)
    info = json.load(open(os.path.join(ROOT, "teaminfo.json"), encoding="utf-8"))
    for code in info:
        ev = [ics_event(x, code) for x in SCH if code in teams_of(x["rid"], x["g"])]
        open(os.path.join(ROOT, "cal", f"{code}.ics"), "w", encoding="utf-8", newline="").write(ics(f"SSL Gold Cup – {info[code].get('name', code)}", ev))


def trim_all(a):
    """The parts of Georacing's all.json the in-app tracker needs (the browser may not read it cross-origin)."""
    r = a.get("race") or {}
    keep = lambda d, ks: {k: d.get(k) for k in ks}
    return {
        "race": keep(r, ["id", "name", "start_time", "end_time", "available_time", "time_delay_2d", "format_data"]),
        "actors": [keep(x, ["id", "short_name", "name", "color"]) for x in a.get("actors") or []],
        "courses": [{"name": c.get("name"), "active": c.get("active"), "course_objects": [
            {**keep(o, ["name", "type", "role", "order"]), "course_elements": [keep(el, ["id", "name", "color"]) for el in o.get("course_elements") or []]}
            for o in c.get("course_objects") or []]} for c in a.get("courses") or []],
        "splittimes": [{**keep(sp, ["name", "role"]), "splittimes": [keep(t, ["actor_id", "time", "rank"]) for t in sp.get("splittimes") or []]}
                       for sp in a.get("splittimes") or []],
        "weathers": [keep(w, ["wind_direction", "time"]) for w in a.get("weathers") or []],
    }


def mirror_race(ev, rc):
    try:
        a = json.load(urllib.request.urlopen(urllib.request.Request(f"https://player.georacing.com/datas/{ev}/{rc}/all.json",
                      headers={"User-Agent": "Mozilla/5.0 Chrome/131", "Referer": "https://player.georacing.com/"}), timeout=20))
        os.makedirs(os.path.join(ROOT, "trk"), exist_ok=True)
        json.dump(trim_all(a), open(os.path.join(ROOT, "trk", f"{rc}.json"), "w"), separators=(",", ":"))
    except Exception as ex:
        print("tracking mirror", rc, "skipped –", ex)


def build_tracking():
    out = {}
    try:
        get = lambda u: json.load(urllib.request.urlopen(urllib.request.Request(u, headers={"User-Agent": "Mozilla/5.0"}), timeout=20))
        app = get("https://player.georacing.com/datas/applications/app_46.json")
        RM = [("1/32", "r32"), ("1/16", "r16"), ("1/8", "r8"), ("1/4", "r4"), ("Quarter", "r4"), ("1/2", "sf"), ("Semi", "sf")]
        for e in app.get("events", []):
            if "2026" not in e.get("name", "") or "Qualif" in e.get("name", ""):
                continue
            rid = next((v for k, v in RM if k in e["name"]), None)
            for x in get(f"https://player.georacing.com/datas/{e['id']}/races.json"):
                nm = x.get("name") or ""
                url = f"https://player.georacing.com/{x.get('player_name') or ''}?event={e['id']}&race={x['id']}&application_id=46"
                mirror_race(e["id"], x["id"])
                m = re.match(r"Race\s*(\d)\s*-\s*Group\s*([A-D])", nm, re.I)
                if m and rid:
                    out.setdefault(rid, {}).setdefault(m.group(2).upper(), {})[m.group(1)] = url
                elif re.search(r"petit", nm, re.I):
                    out.setdefault("pf", {}).setdefault("A", {})["1"] = url
                elif re.fullmatch(r"\s*(grand\s*)?final\s*", nm, re.I):
                    out.setdefault("f", {}).setdefault("A", {})["1"] = url
                elif rid == "sf" and (m2 := re.search(r"\b([AB])\b", nm)):
                    out.setdefault("sf", {}).setdefault(m2.group(1), {})["1"] = url
    except Exception as ex:
        print("tracking: skipped –", ex)
    json.dump(out, open(os.path.join(ROOT, "tracking.json"), "w"), separators=(",", ":"))
    print("tracking rounds:", {k: sum(len(v) for v in g.values()) for k, g in out.items()})


def build_videos():
    """Latest videos of the SSL YouTube channel (public RSS feed, no key needed)."""
    import xml.etree.ElementTree as ET
    out = []
    try:
        url = "https://www.youtube.com/feeds/videos.xml?channel_id=UCslTs2hZG7d08VYH_mLGSUg"
        x = urllib.request.urlopen(urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"}), timeout=20).read()
        ns = {"a": "http://www.w3.org/2005/Atom", "yt": "http://www.youtube.com/xml/schemas/2015", "m": "http://search.yahoo.com/mrss/"}
        for e in ET.fromstring(x).findall("a:entry", ns):
            vid = e.findtext("yt:videoId", "", ns)
            if not re.fullmatch(r"[\w-]{6,20}", vid or ""):
                continue
            out.append({"id": vid, "t": (e.findtext("a:title", "", ns) or "").strip(), "d": e.findtext("a:published", "", ns)})
    except Exception as ex:
        print("videos: could not read feed:", ex)
    json.dump(out, open(os.path.join(ROOT, "videos.json"), "w"), separators=(",", ":"), ensure_ascii=False)
    print("videos:", len(out))


if __name__ == "__main__":
    build_ics()
    build_tracking()
    build_videos()
    try:
        import live_video; live_video.main()
    except Exception as e:
        print("live video:", e)
