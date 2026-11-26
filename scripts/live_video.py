"""Find the SSL YouTube channel's live / upcoming streams and write live.json.

The channel often runs several streams at once (one per commentary language), so all of them are listed:
{"streams":[{"id":..,"t":title,"live":bool,"start":epoch|null,"lang":"en|pt|hu|es|..."}], "id":..,"live":..}
"id"/"live" mirror the best English (else first) stream for older app versions. Never fails the caller.
"""
import json, re, os, datetime, urllib.request, html

CH = "UCslTs2hZG7d08VYH_mLGSUg"
OUT = os.path.join(os.path.dirname(__file__), "..", "live.json")
H = {"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/131 Safari/537.36", "Accept-Language": "en-US,en", "Cookie": "CONSENT=YES+1; SOCS=CAI"}

def lang_of(t):
    s = " " + t.lower() + " "
    if re.search(r"\bhun\b|döntő|\bnap\b", s): return "hu"
    if re.search(r"\bdia\b|fase de|ao vivo|português|\bpt\b|regata", s): return "pt"
    if re.search(r"\bdía\b|en directo|español|\bes\b", s): return "es"
    if re.search(r"\bjour\b|français|\bfr\b", s): return "fr"
    if re.search(r"\btag\b|deutsch|\bde\b", s): return "de"
    return "en"

def walk(o, out):
    if isinstance(o, dict):
        if "videoRenderer" in o: out.append(("v", o["videoRenderer"]))
        if "lockupViewModel" in o: out.append(("l", o["lockupViewModel"]))
        for v in o.values(): walk(v, out)
    elif isinstance(o, list):
        for v in o: walk(v, out)

def from_lockup(l):
    j = json.dumps(l, ensure_ascii=False)
    vid = l.get("contentId")
    t = re.search(r'"title": \{"content": "((?:[^"\\]|\\.)*)"', j)
    title = json.loads('"' + t.group(1) + '"') if t else ""
    live = bool(re.search(r'"text": "LIVE"|BADGE_STYLE_TYPE_LIVE|THUMBNAIL_OVERLAY_BADGE_STYLE_LIVE|"LIVE"', j))
    up = bool(re.search(r'UPCOMING|Upcoming|Scheduled|Notify me|Premieres', j))
    st = re.search(r'"startTime": "?(\d{9,11})', j)
    return vid, title, live, (int(st.group(1)) if st else (0 if up else None))

def main():
    try:
        s = urllib.request.urlopen(urllib.request.Request(f"https://www.youtube.com/channel/{CH}/streams", headers=H), timeout=25).read().decode("utf-8", "replace")
        m = re.search(r"var ytInitialData = (\{.*?\});</script>", s, re.S)
        data = json.loads(m.group(1)) if m else {}
    except Exception as e:
        print("live: could not read channel:", e); return
    vids = []; walk(data, vids)
    streams = []
    now = datetime.datetime.utcnow().timestamp()
    for kind, v in vids:
        if kind == "l":
            vid, title, live, up = from_lockup(v)
        else:
            vid = v.get("videoId"); title = "".join(r.get("text", "") for r in (v.get("title", {}).get("runs") or []))
            styles = json.dumps(v.get("thumbnailOverlays", [])) + json.dumps(v.get("badges", []))
            live = '"LIVE"' in styles or "BADGE_STYLE_TYPE_LIVE_NOW" in styles
            up = v.get("upcomingEventData", {}).get("startTime")
        if not vid or not (live or up is not None): continue
        start = int(up) if up else None
        if start and start - now > 36 * 3600: continue
        if any(x["id"] == vid for x in streams): continue
        streams.append({"id": vid, "t": html.unescape(title), "live": live, "start": start, "lang": lang_of(title)})
    streams.sort(key=lambda x: (not x["live"], x["start"] or 0))
    best = next((x for x in streams if x["lang"] == "en"), streams[0] if streams else None)
    out = {"streams": streams, "id": best["id"] if best else "", "live": bool(best and best["live"]), "t": best["t"] if best else ""}
    try: old = json.load(open(OUT))
    except Exception: old = {}
    if [(x["id"], x["live"]) for x in old.get("streams", [])] != [(x["id"], x["live"]) for x in streams]:
        out["at"] = datetime.datetime.utcnow().strftime("%Y-%m-%dT%H:%M:%SZ")
        json.dump(out, open(OUT, "w"), ensure_ascii=False)
        print("live: changed ->", json.dumps(out, ensure_ascii=False)[:600])
    else:
        print("live: unchanged", len(streams), "streams")

if __name__ == "__main__":
    main()
