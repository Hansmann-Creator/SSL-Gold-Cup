"""Race days: notice when Georacing sets up a course/boats (or results) for today's races, so the site rebuilds its tracking mirror.
Exit code 0 + prints 'changed' when today's race set-up differs from the last check (state kept in /tmp)."""
import json, urllib.request, datetime, hashlib, os, sys
H = {"User-Agent": "Mozilla/5.0 Chrome/131", "Referer": "https://player.georacing.com/"}
get = lambda u: json.load(urllib.request.urlopen(urllib.request.Request(u, headers=H), timeout=20))
STATE = "/tmp/trk_sig"
today = (datetime.datetime.utcnow() - datetime.timedelta(hours=3)).strftime("%Y-%m-%d")
sig = []
try:
    for e in get("https://player.georacing.com/datas/applications/app_46.json").get("events", []):
        if "2026" not in e.get("name", "") or "Qualif" in e.get("name", ""): continue
        for x in get(f"https://player.georacing.com/datas/{e['id']}/races.json"):
            st = x.get("start_time") or ""
            loc = (datetime.datetime.fromisoformat(st.replace("Z", "+00:00")) - datetime.timedelta(hours=3)).strftime("%Y-%m-%d") if st else ""
            if loc != today: continue
            a = get(f"https://player.georacing.com/datas/{e['id']}/{x['id']}/all.json")
            sig.append([x["id"], [y.get("id") for y in a.get("actors") or []],
                        [[o.get("name"), [el.get("id") for el in o.get("course_elements") or []]] for c in a.get("courses") or [] if c.get("active") for o in c.get("course_objects") or []],
                        sum(len(s.get("splittimes") or []) for s in a.get("splittimes") or [] if s.get("role") == "finish")])
except Exception as ex:
    print("trk_watch:", ex); sys.exit(1)
h = hashlib.sha1(json.dumps(sig).encode()).hexdigest()
old = open(STATE).read() if os.path.exists(STATE) else ""
open(STATE, "w").write(h)
print("changed" if old and old != h else "same", len(sig), "races today")
