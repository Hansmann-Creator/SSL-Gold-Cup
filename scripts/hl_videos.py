"""Keep a growing list of the SSL YouTube channel's videos for the race pages (highlight film of the race day).

The public RSS feed only lists the latest ~15 videos, so this merges every run into hl.json instead of replacing it:
  {"v": [{"id", "t", "d"}], "pin": {"YYYY-MM-DD" | "r16|A|1": "videoId"}}
"pin" = manual choices (by hand only, never written by this script); the app picks the highlight film per race day
from "pin" first, otherwise from "v" (title looks like highlights/recap, published that race day or before the next one).
"""
import json, os, re, urllib.request
import xml.etree.ElementTree as ET

ROOT = os.path.join(os.path.dirname(__file__), "..")
P = os.path.join(ROOT, "hl.json")
URL = "https://www.youtube.com/feeds/videos.xml?channel_id=UCslTs2hZG7d08VYH_mLGSUg"
NS = {"a": "http://www.w3.org/2005/Atom", "yt": "http://www.youtube.com/xml/schemas/2015"}


def main():
    J = json.load(open(P, encoding="utf-8")) if os.path.exists(P) else {}
    J.setdefault("v", []); J.setdefault("pin", {})
    seen = {x["id"] for x in J["v"]}
    try:
        x = urllib.request.urlopen(urllib.request.Request(URL, headers={"User-Agent": "Mozilla/5.0"}), timeout=20).read()
    except Exception as ex:
        print("hl: feed not reachable:", ex); return
    new = 0
    for e in ET.fromstring(x).findall("a:entry", NS):
        vid = e.findtext("yt:videoId", "", NS)
        if not re.fullmatch(r"[\w-]{6,20}", vid or ""): continue
        t = (e.findtext("a:title", "", NS) or "").strip(); d = e.findtext("a:published", "", NS)
        if vid in seen:
            for v in J["v"]:
                if v["id"] == vid: v["t"] = t   # titles get edited after upload
            continue
        J["v"].append({"id": vid, "t": t, "d": d}); seen.add(vid); new += 1
    J["v"].sort(key=lambda v: v["d"], reverse=True); J["v"] = J["v"][:400]
    json.dump(J, open(P, "w", encoding="utf-8"), ensure_ascii=False, indent=0)
    print("hl: new videos", new, "total", len(J["v"]))


if __name__ == "__main__":
    main()
