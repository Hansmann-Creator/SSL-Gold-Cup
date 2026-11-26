"""Find the SSL YouTube channel's current live video and write live.json.

{"id": "<videoId>", "live": true/false, "t": "<title>", "at": "<UTC time checked>"}
live=false with an id means a scheduled (upcoming) stream. Never fails the caller.
"""
import json, re, os, datetime, urllib.request, html

CH = "UCslTs2hZG7d08VYH_mLGSUg"
OUT = os.path.join(os.path.dirname(__file__), "..", "live.json")

def main():
    old = {}
    try: old = json.load(open(OUT))
    except Exception: pass
    out = {"id": "", "live": False, "t": ""}
    try:
        req = urllib.request.Request(f"https://www.youtube.com/channel/{CH}/live",
                                     headers={"User-Agent": "Mozilla/5.0", "Accept-Language": "en", "Cookie": "CONSENT=YES+1"})
        s = urllib.request.urlopen(req, timeout=20).read().decode("utf-8", "replace")
        m = re.search(r'<link rel="canonical" href="https://www\.youtube\.com/watch\?v=([\w-]{6,20})"', s)
        if m:
            out["id"] = m.group(1)
            out["live"] = bool(re.search(r'"isLiveNow"\s*:\s*true', s) or re.search(r'"isLive"\s*:\s*true', s))
            t = re.search(r'<meta name="title" content="([^"]*)"', s)
            out["t"] = html.unescape(t.group(1)) if t else ""
    except Exception as e:
        print("live: could not check:", e); return
    if {k: old.get(k) for k in ("id", "live")} != {k: out[k] for k in ("id", "live")}:
        out["at"] = datetime.datetime.utcnow().strftime("%Y-%m-%dT%H:%M:%SZ")
        json.dump(out, open(OUT, "w"), ensure_ascii=False)
        print("live: changed ->", out)
    else:
        print("live: unchanged", out["id"], out["live"])

if __name__ == "__main__":
    main()
