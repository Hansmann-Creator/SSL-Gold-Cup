"""Race course picture + own speed stats from Georacing's position files.

For every race: where the marks were (median position while the race was on), each boat's track from just
before its start to its finish (thinned to one point every few seconds), and our own top speed per boat
(best average over >= 10 s, computed from positions, GPS jumps removed). Writes crs/<round>_<group>_<race>.json.

  python3 scripts/course.py            races of today (Rio)
  python3 scripts/course.py all        every 2026 Final Series race
  python3 scripts/course.py one KEY    a single race key, e.g. r16|C|1 (prints details)
Prints 'changed ...' when a file was written. The decoder mirrors geoDecode() in app.js."""
import json, urllib.request, urllib.error, re, datetime, os, sys, math, struct, statistics

ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..")
OUT = os.path.join(ROOT, "crs")
GEOD = "https://player.georacing.com/datas/"
H = {"User-Agent": "Mozilla/5.0 Chrome/131", "Referer": "https://player.georacing.com/"}
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from ticker import race_key  # same race naming as the ticker

P = lambda s: datetime.datetime.fromisoformat(s.replace("Z", "+00:00"))
GF = [("lg", "f64", 8, 1e6), ("lt", "f64", 8, 1e6), ("al", "f32", 4, 1e6), ("s", "f32", 4, 1e6), ("h", "u16", 2, 65535),
      ("vmg", "f32", 4, 1e6), ("status", "u8", 1, 127), ("cl", "u8", 1, 127), ("d", "f32", 4, -1), ("dtnm", "f32", 4, -1),
      ("r", "u16", 2, 9999), ("p", "i16", 2, 9999), ("gps", "u16", 2, 65535), ("gsm", "u8", 1, 127), ("bat", "u8", 1, 127),
      ("ecart_d", "f32", 4, 1e6), ("int_1", "u16", 2, 65535), ("s_1", "f32", 4, 1e6), ("h_1", "u16", 2, 65535),
      ("vmg_1", "f32", 4, 1e6), ("int_2", "u16", 2, 65535), ("s_2", "f32", 4, 1e6), ("h_2", "u16", 2, 65535),
      ("vmg_2", "f32", 4, 1e6), ("tws", "f32", 4, 1e6), ("twd", "u16", 2, 65535), ("water_temp", "i16", 2, 65535),
      ("air_temp", "i16", 2, 65535), ("air_pression", "u16", 2, 65535), ("dp_1", "f32", 4, 1e6), ("dp_2", "f32", 4, 1e6)]


def get(u, raw=False):
    with urllib.request.urlopen(urllib.request.Request(u, headers=H), timeout=30) as r:
        b = r.read()
    return b if raw else json.loads(b)


def rd(b, f, t):
    if t == "u8": return b[f]
    if t == "u16": return struct.unpack_from(">H", b, f)[0]          # DataView default: big endian
    if t == "i16": return struct.unpack_from(">h", b, f)[0]
    if t == "f32": return struct.unpack_from("<f", b, f)[0]          # floats: little endian (as in app.js)
    return struct.unpack_from("<d", b, f)[0]


def decode(b, day):
    Y, M, D = map(int, day.split("_"))
    base = datetime.datetime(Y, M, D, tzinfo=datetime.timezone.utc).timestamp() * 1000
    end, out, o = len(b), [], 0
    while o + 5 <= end:
        ver, na, mn = b[o], struct.unpack_from(">H", b, o + 1)[0], struct.unpack_from(">H", b, o + 3)[0]
        if ver > 3 or not na: break
        if ver >= 3:
            nf = b[o + 9]; hd = 10 + nf; st = []; rs = 2
            for i in range(nf):
                fid = b[o + 10 + i]
                if fid >= len(GF): st = None; break
                st.append(fid); rs += GF[fid][2]
            if st is None: break
        else:
            hd = 9 if ver >= 2 else 5; st = [10, 7, 8, 0, 1, 2, 3, 4, 9]; rs = 39
        ms = struct.unpack_from(">I", b, o + 5)[0] if ver >= 2 else hd + (9 + 60 * rs) * na
        if ms <= hd: break
        t0 = base + 60000 * mn; p = o + hd; A = []
        for _ in range(na):
            if p + 9 > end: break
            tb = struct.unpack_from(">H", b, p + 5)[0]
            if tb > 4091: tb -= 65536
            if not tb: tb = 1
            A.append((struct.unpack_from(">I", b, p)[0], tb)); p += 9
        q = p
        for aid, tb in A:
            step = tb if tb > 0 else -1 / tb
            n = max(1, math.ceil(60 / step))
            for k in range(n):
                if q + rs > end: break
                if not b[q]: q += rs; continue
                off = b[q + 1]; r = {"id": aid}; f = q + 2
                for fid in st:
                    name, typ, size, null = GF[fid]
                    x = rd(b, f, typ); r[name] = None if x == null else x; f += size
                q += rs
                if r.get("lt") is None or r.get("lg") is None or (not r["lg"] and not r["lt"]): continue
                r["t"] = t0 + round(1000 * (k * step + off))
                out.append(r)
        o += ms
    return out


def positions(ev, rc, t_from, t_to):
    """All decoded points of a race between two times (ms)."""
    days = sorted({datetime.datetime.fromtimestamp(t / 1000, datetime.timezone.utc).strftime("%Y_%m_%d") for t in (t_from, t_to)})
    pts = []
    for day in days:
        for i in range(0, 120):
            try: b = get(f"{GEOD}{ev}/{rc}/positions/{day}__r{i}__positions.bin", raw=True)
            except urllib.error.HTTPError: break
            pts += [p for p in decode(b, day) if t_from <= p["t"] <= t_to]
    return pts


def dist_m(a, b):
    la = math.radians((a[0] + b[0]) / 2)
    return math.hypot((b[0] - a[0]) * 111195.0, (b[1] - a[1]) * 111195.0 * math.cos(la))


def top_speed(tr):
    """Best average speed over >= 10 s (kn). Segments implying > 30 kn are GPS jumps and split the track."""
    best = 0.0
    segs, cur = [], [tr[0]] if tr else []
    for a, b in zip(tr, tr[1:]):
        dt = (b[2] - a[2]) / 1000
        if dt <= 0: continue
        if dt > 20 or dist_m(a, b) / dt * 1.94384 > 30: segs.append(cur); cur = [b]; continue
        cur.append(b)
    segs.append(cur)
    for s in segs:
        j = 0; acc = 0.0; cum = [0.0]
        for a, b in zip(s, s[1:]): cum.append(cum[-1] + dist_m(a, b))
        for i in range(len(s)):
            while j < len(s) and (s[j][2] - s[i][2]) < 10000: j += 1
            if j >= len(s): break
            dt = (s[j][2] - s[i][2]) / 1000
            if dt > 15: continue
            best = max(best, (cum[j] - cum[i]) / dt * 1.94384)
    return round(best, 1)


def build(a, ev, rc):
    r = a.get("race") or {}
    act = {int(x["id"]): (x.get("short_name") or "").upper() for x in a.get("actors") or []}
    sp = {s.get("role"): {int(t["actor_id"]): P(t["time"]).timestamp() * 1000 for t in s.get("splittimes") or [] if t.get("time")}
          for s in a.get("splittimes") or [] if s.get("role") in ("start", "finish")}
    st, fi = sp.get("start") or {}, sp.get("finish") or {}
    if not st: return None
    gun = P(r["start_time"]).timestamp() * 1000 if r.get("start_time") else min(st.values())
    t0 = min(min(st.values()), gun) - 90_000
    t1 = max(fi.values()) + 15_000 if fi else max(st.values()) + 60 * 60_000
    course = next((c for c in a.get("courses") or [] if int(c.get("active") or 0)), (a.get("courses") or [None])[0])
    objs = sorted([o for o in (course or {}).get("course_objects") or [] if int(o.get("order") or 0) > 0], key=lambda o: int(o["order"]))
    pts = positions(ev, rc, t0, t1)
    by = {}
    for p in pts: by.setdefault(p["id"], []).append((p["lt"], p["lg"], p["t"]))
    for v in by.values(): v.sort(key=lambda z: z[2])
    marks = []
    for o in objs:
        els = []
        for e in o.get("course_elements") or []:
            v = [z for z in by.get(int(e["id"]), []) if gun <= z[2] <= t1]
            if len(v) >= 3: els.append([round(statistics.median(z[0] for z in v), 6), round(statistics.median(z[1] for z in v), 6)])
        if els: marks.append({"n": o.get("name"), "r": o.get("role") or o.get("type") or "", "p": els})
    tracks, ts = {}, {}
    for aid, code in act.items():
        v = by.get(aid) or []
        s0, f0 = st.get(aid), fi.get(aid)
        if not v or s0 is None: continue
        v = [z for z in v if s0 - 60_000 <= z[2] <= (f0 + 10_000 if f0 else t1)]
        if len(v) < 10: continue
        thin, last = [], -1e18
        for z in v:
            if z[2] - last >= 4000: thin.append([round(z[0], 5), round(z[1], 5)]); last = z[2]
        tracks[code] = thin
        ts[code] = top_speed([z for z in v if z[2] >= s0])
    if not tracks: return None
    return {"mk": marks, "tr": tracks, "ts": ts, "n": len(pts)}


def save(key, o):
    os.makedirs(OUT, exist_ok=True)
    p = os.path.join(OUT, key.replace("|", "_") + ".json")
    old = json.load(open(p)) if os.path.exists(p) else None
    if old and sum(len(v) for v in old.get("tr", {}).values()) > sum(len(v) for v in o["tr"].values()):
        return False                          # Georacing cleared part of the race: keep the fuller file
    o.pop("n", None); o["k"] = key
    new = json.dumps(o, separators=(",", ":"), sort_keys=True)
    if old is not None and json.dumps(old, separators=(",", ":"), sort_keys=True) == new: return False
    open(p, "w").write(new)
    return True


def main():
    mode = sys.argv[1] if len(sys.argv) > 1 else "today"
    want = sys.argv[2] if mode == "one" else None
    today = (datetime.datetime.now(datetime.timezone.utc) - datetime.timedelta(hours=3)).strftime("%Y-%m-%d")
    changed = []
    for e in get(f"{GEOD}applications/app_46.json").get("events", []):
        if "2026" not in e.get("name", "") or "Qualif" in e.get("name", ""): continue
        for x in get(f"{GEOD}{e['id']}/races.json"):
            k = race_key(e["name"], x.get("name"))
            if not k or (want and k != want): continue
            stt = x.get("start_time") or ""
            if mode == "today" and (not stt or (P(stt) - datetime.timedelta(hours=3)).strftime("%Y-%m-%d") != today): continue
            if mode == "all" and stt and P(stt) > datetime.datetime.now(datetime.timezone.utc): continue
            try:
                a = get(f"{GEOD}{e['id']}/{x['id']}/all.json")
                o = build(a, e["id"], x["id"])
            except Exception as ex:
                print("course:", k, ex); continue
            if not o: continue
            if want:
                print(k, "points", o["n"], "marks", [(m["n"], m["r"], m["p"]) for m in o["mk"]])
                print("tracks", {c: len(v) for c, v in o["tr"].items()}, "top speed", o["ts"])
            if save(k, o): changed.append(k)
    print(("changed " + " ".join(changed)) if changed else "same")


if __name__ == "__main__":
    main()
