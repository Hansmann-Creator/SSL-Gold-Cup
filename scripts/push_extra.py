"""Extra push notifications (OneSignal), each one opt-in from the app's settings:

  remind  – 15 minutes before a race: to followers of the racing teams who switched on reminders (tag rem)
  live    – the SSL livestream has just gone live: to users with tag live
  video   – a new highlight video on the SSL channel: to users with tag vid

Usage: python scripts/push_extra.py remind|live|video [--dry]
State (what was already sent) lives in a small JSON file so nothing is sent twice.
Needs env ONESIGNAL_REST_KEY and the App ID in config.js; quietly does nothing otherwise. Never fails the caller.
"""
import json, os, re, sys, datetime, urllib.request

sys.path.insert(0, os.path.dirname(__file__))
from notify import LANGS, APPL, RN, W, SITE, audience, send  # noqa: E402

ROOT = os.path.join(os.path.dirname(__file__), "..")
STATE = os.environ.get("PUSH_STATE", os.path.join(ROOT, "push_state.json"))

T = {  # reminder title/body, live, video – per app language
 "en": ("Starting in 15 minutes", "Live now: SSL Gold Cup", "New highlights", "Watch the livestream in the app"),
 "de": ("Start in 15 Minuten", "Jetzt live: SSL Gold Cup", "Neue Highlights", "Livestream in der App ansehen"),
 "fr": ("Départ dans 15 minutes", "En direct : SSL Gold Cup", "Nouveaux temps forts", "Regardez le direct dans l'app"),
 "es": ("Salida en 15 minutos", "En directo: SSL Gold Cup", "Nuevos resúmenes", "Mira el directo en la app"),
 "pt": ("Largada em 15 minutos", "Ao vivo: SSL Gold Cup", "Novos destaques", "Assista à transmissão no app"),
 "it": ("Partenza tra 15 minuti", "Ora in diretta: SSL Gold Cup", "Nuovi highlights", "Guarda la diretta nell’app"),
 "zh-Hans": ("15分钟后起航", "正在直播：SSL金杯", "新集锦", "在应用中观看直播"),
 "ar": ("الانطلاق بعد 15 دقيقة", "مباشر الآن: SSL Gold Cup", "ملخصات جديدة", "شاهد البث في التطبيق"),
 "hi": ("15 मिनट में स्टार्ट", "अभी लाइव: SSL गोल्ड कप", "नई हाइलाइट्स", "ऐप में लाइव स्ट्रीम देखें"),
 "bn": ("১৫ মিনিটে স্টার্ট", "এখন লাইভ: SSL গোল্ড কাপ", "নতুন হাইলাইটস", "অ্যাপে লাইভ স্ট্রিম দেখুন"),
 "ur": ("15 منٹ میں اسٹارٹ", "ابھی لائیو: SSL گولڈ کپ", "نئی جھلکیاں", "ایپ میں لائیو اسٹریم دیکھیں"),
 "id": ("Start dalam 15 menit", "Live sekarang: SSL Gold Cup", "Sorotan baru", "Tonton siaran langsung di aplikasi"),
 "ms": ("Bermula dalam 15 minit", "Langsung sekarang: SSL Gold Cup", "Sorotan baharu", "Tonton siaran langsung dalam aplikasi"),
 "ja": ("15分後にスタート", "ライブ配信中:SSLゴールドカップ", "新しいハイライト", "アプリでライブ配信を見る"),
 "th": ("ออกตัวในอีก 15 นาที", "ถ่ายทอดสดตอนนี้: SSL Gold Cup", "ไฮไลต์ใหม่", "ดูถ่ายทอดสดในแอป"),
 "hu": ("Rajt 15 perc múlva", "Most élőben: SSL Gold Cup", "Új összefoglaló", "Nézd az élő közvetítést az appban"),
 "pl": ("Start za 15 minut", "Teraz na żywo: SSL Gold Cup", "Nowy skrót", "Oglądaj transmisję w aplikacji"),
 "cs": ("Start za 15 minut", "Právě živě: SSL Gold Cup", "Nový sestřih", "Sledujte přenos v aplikaci"),
 "uk": ("Старт за 15 хвилин", "Наживо: SSL Gold Cup", "Нові найкращі моменти", "Дивіться трансляцію в застосунку"),
}


def cfg():
    key_ = os.environ.get("ONESIGNAL_REST_KEY", "").strip()
    try:
        app = re.search(r'push\s*:\s*"([^"]*)"', open(os.path.join(ROOT, "config.js"), encoding="utf-8").read()).group(1).strip()
    except Exception:
        app = ""
    return app, key_


def load_state():
    try:
        return json.load(open(STATE, encoding="utf-8"))
    except Exception:
        return {}


def save_state(s):
    json.dump(s, open(STATE, "w", encoding="utf-8"), ensure_ascii=False, separators=(",", ":"), sort_keys=True)


def common(app, url, topic, ttl):
    return {"app_id": app, "target_channel": "push", "url": url, "web_push_topic": topic, "ttl": ttl, "chrome_web_icon": SITE + "icons/icon-192.png"}


def remind(app, key_, dry):
    import build_extras as B
    st = load_state(); sent = set(st.get("rem", []))
    now = datetime.datetime.now(datetime.timezone.utc)
    for x in B.SCH:
        at = datetime.datetime.fromisoformat(f"{x['d']}T{x['t']}:00-03:00")
        mins = (at - now).total_seconds() / 60
        k = f"{x['rid']}|{x['g']}|{x['n']}"
        if not (12 <= mins <= 16) or k in sent:
            continue
        teams = [t for t in B.teams_of(x["rid"], x["g"]) if re.fullmatch(r"[A-Z]{3}", t)]
        if not teams:
            continue
        for L in LANGS:
            lv = APPL.get(L, L)
            grp, rc = W[L][0], W[L][1]
            head = f"⏱ {T[L][0]}"
            body = f"{RN[L][x['rid']]} · {grp} {x['g']} · {rc} {x['n']} · {x['t']}\n{'  '.join(teams)}"
            payload = {**common(app, f"{SITE}#race-{x['rid']}-{x['g']}-{x['n']}", f"rem-{k}", 1200),
                       "filters": audience(["team_" + t for t in teams], lv, extra=[{"field": "tag", "key": "rem", "relation": "exists"}]),
                       "headings": {"en": head}, "contents": {"en": body}}
            if dry: print(json.dumps(payload["headings"]), body); break
            send(app, key_, payload, f"reminder {k} [{lv}]")
        sent.add(k)
    st["rem"] = sorted(sent)[-80:]
    if not dry: save_state(st)


def live(app, key_, dry):
    st = load_state()
    try:
        j = json.load(open(os.path.join(ROOT, "live.json"), encoding="utf-8"))
    except Exception:
        return
    ids = [s["id"] for s in j.get("streams", []) if s.get("live")]
    if not ids:
        return
    if set(ids) <= set(st.get("live", [])):
        return
    for L in LANGS:
        lv = APPL.get(L, L)
        payload = {**common(app, f"{SITE}#watch", "live", 3 * 3600), "filters": audience(["live"], lv),
                   "headings": {"en": "🔴 " + T[L][1]}, "contents": {"en": T[L][3]}}
        if dry: print(payload["headings"]); break
        send(app, key_, payload, f"live [{lv}]")
    st["live"] = (st.get("live", []) + ids)[-30:]
    if not dry: save_state(st)


def video(app, key_, dry):
    import xml.etree.ElementTree as ET
    st = load_state()
    try:
        x = urllib.request.urlopen(urllib.request.Request("https://www.youtube.com/feeds/videos.xml?channel_id=UCslTs2hZG7d08VYH_mLGSUg",
                                                          headers={"User-Agent": "Mozilla/5.0"}), timeout=20).read()
    except Exception as e:
        print("video push: feed unreadable:", e); return
    ns = {"a": "http://www.w3.org/2005/Atom", "yt": "http://www.youtube.com/xml/schemas/2015"}
    vids = [(e.findtext("yt:videoId", "", ns), (e.findtext("a:title", "", ns) or "").strip()) for e in ET.fromstring(x).findall("a:entry", ns)]
    hl = [(v, t) for v, t in vids if re.search(r"highlight|resumo|melhores|resumen|faits saillants|összefoglal", t, re.I)]
    if not hl:
        return
    if "vid" not in st:  # first run: remember what exists, send nothing
        st["vid"] = [v for v, _ in hl]; save_state(st); print("video push: initialised"); return
    new = [(v, t) for v, t in hl if v not in st["vid"]]
    if not new:
        return
    v, t = new[0]
    for L in LANGS:
        lv = APPL.get(L, L)
        payload = {**common(app, f"{SITE}#home", "video", 24 * 3600), "filters": audience(["vid"], lv, spoiler=False),
                   "headings": {"en": "🎬 " + T[L][2]}, "contents": {"en": t[:120]}}
        if dry: print(payload["headings"], t); break
        send(app, key_, payload, f"video {v} [{lv}]")
    st["vid"] = (st["vid"] + [v for v, _ in new])[-60:]
    if not dry: save_state(st)


def main():
    mode = (sys.argv[1:] or [""])[0]
    dry = "--dry" in sys.argv
    app, key_ = cfg()
    if not dry and (not app or not key_):
        print("push extra: not configured, skipping"); return
    {"remind": remind, "live": live, "video": video}.get(mode, lambda *a: print("usage: remind|live|video"))(app, key_, dry)


if __name__ == "__main__":
    try:
        main()
    except Exception as e:
        print("push extra: unexpected error:", e)
