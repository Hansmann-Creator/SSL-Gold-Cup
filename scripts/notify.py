"""Send push notifications (OneSignal) for new race results.

Usage: python scripts/notify.py OLD_results.json NEW_results.json [--dry]

Compares the two files and sends one notification per group that got new races:
to everyone who follows one of the group's teams (tag team_XXX) or all results (tag all).
Needs env ONESIGNAL_REST_KEY; the App ID comes from config.js. Never fails the caller.
"""
import json, os, re, sys, urllib.request

LANGS = ["en", "de", "fr", "es", "pt", "it", "zh-Hans", "ar", "hi", "bn", "ur", "id", "ms", "ja", "th", "hu", "cs", "uk", "pl"]
APPL = {"zh-Hans": "zh"}  # tag value "l" = app language code
RN = {
 "en": {"r32": "1/32 Finals", "r16": "1/16 Finals", "r8": "1/8 Finals", "r4": "Quarter-finals", "sf": "Semi-finals", "pf": "Petit Final", "f": "Grand Final"},
 "de": {"r32": "1/32-Finale", "r16": "1/16-Finale", "r8": "Achtelfinale", "r4": "Viertelfinale", "sf": "Halbfinale", "pf": "Kleines Finale", "f": "Grand Final"},
 "fr": {"r32": "1/32 de finale", "r16": "1/16 de finale", "r8": "1/8 de finale", "r4": "Quarts de finale", "sf": "Demi-finales", "pf": "Petite finale", "f": "Grande finale"},
 "es": {"r32": "1/32 de final", "r16": "1/16 de final", "r8": "Octavos de final", "r4": "Cuartos de final", "sf": "Semifinales", "pf": "Final de consolación", "f": "Gran final"},
 "pt": {"r32": "1/32 de final", "r16": "1/16 de final", "r8": "Oitavas de final", "r4": "Quartas de final", "sf": "Semifinais", "pf": "Petit Final", "f": "Grande Final"},
 "it": {"r32": "1/32 di finale", "r16": "1/16 di finale", "r8": "1/8 di finale", "r4": "Quarti di finale", "sf": "Semifinali", "pf": "Finalina", "f": "Finale"},
 "zh-Hans": {"r32": "1/32 决赛", "r16": "1/16 决赛", "r8": "1/8 决赛", "r4": "四分之一决赛", "sf": "半决赛", "pf": "小决赛", "f": "总决赛"},
 "ar": {"r32": "نهائيات 1/32", "r16": "نهائيات 1/16", "r8": "نهائيات 1/8", "r4": "ربع النهائي", "sf": "نصف النهائي", "pf": "النهائي الصغير", "f": "النهائي الكبير"},
 "hi": {"r32": "1/32 फ़ाइनल", "r16": "1/16 फ़ाइनल", "r8": "1/8 फ़ाइनल", "r4": "क्वार्टर फ़ाइनल", "sf": "सेमीफ़ाइनल", "pf": "पेटिट फ़ाइनल", "f": "ग्रैंड फ़ाइनल"},
 "bn": {"r32": "1/32 ফাইনাল", "r16": "1/16 ফাইনাল", "r8": "1/8 ফাইনাল", "r4": "কোয়ার্টার ফাইনাল", "sf": "সেমিফাইনাল", "pf": "পেটিট ফাইনাল", "f": "গ্র্যান্ড ফাইনাল"},
 "ur": {"r32": "1/32 فائنلز", "r16": "1/16 فائنلز", "r8": "1/8 فائنلز", "r4": "کوارٹر فائنل", "sf": "سیمی فائنل", "pf": "پیٹٹ فائنل", "f": "گرینڈ فائنل"},
 "id": {"r32": "Final 1/32", "r16": "Final 1/16", "r8": "Final 1/8", "r4": "Perempat final", "sf": "Semifinal", "pf": "Final Kecil", "f": "Grand Final"},
 "ms": {"r32": "Final 1/32", "r16": "Final 1/16", "r8": "Final 1/8", "r4": "Suku akhir", "sf": "Separuh akhir", "pf": "Final Kecil", "f": "Final Besar"},
 "ja": {"r32": "1/32ファイナル", "r16": "1/16ファイナル", "r8": "1/8ファイナル", "r4": "準々決勝", "sf": "準決勝", "pf": "3位決定戦", "f": "グランドファイナル"},
 "th": {"r32": "รอบ 1/32", "r16": "รอบ 1/16", "r8": "รอบ 1/8", "r4": "รอบก่อนรองชนะเลิศ", "sf": "รอบรองชนะเลิศ", "pf": "ชิงอันดับ 3", "f": "แกรนด์ไฟนอล"},
 "hu": {"r32": "1/32-es döntő", "r16": "1/16-os döntő", "r8": "Nyolcaddöntő", "r4": "Negyeddöntő", "sf": "Elődöntő", "pf": "Kisdöntő", "f": "Nagydöntő"},
 "cs": {"r32": "1/32 finále", "r16": "1/16 finále", "r8": "Osmifinále", "r4": "Čtvrtfinále", "sf": "Semifinále", "pf": "Malé finále", "f": "Velké finále"},
 "pl": {"r32": "1/32 finału", "r16": "1/16 finału", "r8": "1/8 finału", "r4": "Ćwierćfinały", "sf": "Półfinały", "pf": "Mały finał", "f": "Wielki finał"},
 "uk": {"r32": "1/32 фіналу", "r16": "1/16 фіналу", "r8": "1/8 фіналу", "r4": "Чвертьфінали", "sf": "Півфінали", "pf": "Малий фінал", "f": "Гранд-фінал"},
}
W = {  # group, race, through, out, champion, decided
 "en": ("Group", "Race", "through to", "out", "World Champion", "decided"),
 "de": ("Gruppe", "Rennen", "weiter ins", "raus", "Weltmeister", "entschieden"),
 "fr": ("Groupe", "Course", "qualifiés pour les", "éliminés", "Champion du monde", "terminé"),
 "es": ("Grupo", "Regata", "pasan a", "eliminados", "Campeón del mundo", "decidido"),
 "pt": ("Grupo", "Regata", "avançam para", "eliminados", "Campeão mundial", "decidido"),
 "it": ("Gruppo", "Regata", "passano a", "eliminate", "Campione del mondo", "deciso"),
 "zh-Hans": ("小组", "第", "晋级", "出局", "世界冠军", "已决出"),
 "ar": ("المجموعة", "السباق", "يتأهلان إلى", "خرجا", "بطل العالم", "حُسمت"),
 "hi": ("ग्रुप", "रेस", "आगे:", "बाहर", "विश्व चैंपियन", "तय"),
 "bn": ("গ্রুপ", "রেস", "পরের পর্বে:", "বাদ", "বিশ্বচ্যাম্পিয়ন", "নির্ধারিত"),
 "ur": ("گروپ", "ریس", "اگلے مرحلے میں:", "باہر", "عالمی چیمپئن", "طے"),
 "id": ("Grup", "Lomba", "lolos ke", "tersingkir", "Juara Dunia", "selesai"),
 "ms": ("Kumpulan", "Perlumbaan", "mara ke", "tersingkir", "Juara Dunia", "ditentukan"),
 "ja": ("グループ", "レース", "勝ち上がり:", "敗退", "世界チャンピオン", "決定"),
 "th": ("กลุ่ม", "เรซ", "ผ่านเข้า", "ตกรอบ", "แชมป์โลก", "ตัดสินแล้ว"),
 "hu": ("Csoport", "futam", "továbbjut:", "kiesett", "Világbajnok", "eldőlt"),
 "cs": ("Skupina", "Rozjížďka", "postup:", "vypadli", "Mistr světa", "rozhodnuto"),
 "pl": ("Grupa", "Wyścig", "awans do", "odpadają", "Mistrz świata", "rozstrzygnięte"),
 "uk": ("Група", "Гонка", "проходять у", "вибули", "Чемпіон світу", "визначено"),
}
NEXT = {"r32": "r16", "r16": "r8", "r8": "r4", "r4": "sf", "sf": "f"}
SITE = "https://hansmann-creator.github.io/SSL-Gold-Cup/"

def num(v):
    m = re.match(r"\s*(-?\d+(?:[.,]\d+)?)", str(v))
    return float(m.group(1).replace(",", ".")) if m else None

def races_done(g):
    """Number of races that have a value for every team of the group."""
    rows = g.get("rows") or []
    if len(rows) != 4 or not all(re.fullmatch(r"[A-Z]{3}", r.get("team") or "") for r in rows): return 0, 0
    n = min(len(r.get("r") or []) for r in rows)
    k = 0
    while k < n and all(num(r["r"][k]) is not None for r in rows): k += 1
    return k, n

def groups(d):
    return {(r["id"], g["id"]): g for r in d.get("rounds", []) for g in r.get("groups", [])}

def flag(c, info): return ((info.get(c) or {}).get("flag") or "") + " " + c

def message(rid, gid, g, k, n, info):
    rows = g["rows"]
    order = sorted(rows, key=lambda r: -num(r["r"][k - 1]))
    race = "  ".join(f"{i}. {flag(r['team'], info)}" for i, r in enumerate(order, 1))
    done = k == n
    def tot(r):
        t = num(r.get("total"))
        return t if t is not None else sum(num(x) or 0 for x in r["r"])
    teams = [r["team"] for r in sorted(rows, key=lambda r: -tot(r))]  # stable: ties keep the official order
    head, body = {}, {}
    for L in LANGS:
        grp, rc, thr, out, champ, dec = W[L]
        rname = RN[L][rid]
        rlab = f"第 {k} 场" if L == "zh-Hans" else f"{rc} {k}"
        h = f"{rname} · {grp} {gid}" if rid not in ("pf", "f") else rname
        if done: h += f" · {dec}"
        b = f"{rlab}: {race}"
        if done:
            if rid == "f":
                b += f"\n🏆 {champ}: {flag(teams[0], info)}  🥈 {flag(teams[1], info)}  🥉 {flag(teams[2], info)}"
            elif rid == "pf":
                b += "\n" + "  ".join(f"{i}. {flag(t, info)}" for i, t in enumerate(teams, 5))
            elif rid in NEXT:
                b += f"\n✅ {flag(teams[0], info)}, {flag(teams[1], info)} {thr} {RN[L][NEXT[rid]]}"
                b += f"\n➜ {flag(teams[2], info)}, {flag(teams[3], info)} {RN[L]['pf']}" if rid == "sf" else f"\n❌ {flag(teams[2], info)}, {flag(teams[3], info)} {out}"
        head[L], body[L] = h, b
    return head, body, teams

def main():
    args = [a for a in sys.argv[1:] if not a.startswith("--")]
    dry = "--dry" in sys.argv
    key_ = os.environ.get("ONESIGNAL_REST_KEY", "").strip()
    try:
        app = re.search(r'push\s*:\s*"([^"]*)"', open("config.js", encoding="utf-8").read()).group(1).strip()
    except Exception:
        app = ""
    if not dry and (not key_ or not app):
        print("push: not configured, skipping"); return
    try:
        old, new = (json.load(open(p, encoding="utf-8")) for p in args[:2])
        info = json.load(open("teaminfo.json", encoding="utf-8"))
    except Exception as e:
        print("push: cannot read files:", e); return
    go, gn = groups(old), groups(new)
    out = []
    for (rid, gid), g in gn.items():
        k, n = races_done(g)
        ko = races_done(go[(rid, gid)])[0] if (rid, gid) in go else 0
        if k > ko:
            # different teams than before = data glitch, not a result
            if ko and sorted(r["team"] for r in go[(rid, gid)]["rows"]) != sorted(r["team"] for r in g["rows"]):
                continue
            out.append((rid, gid, g, k, n))
    if not out: print("push: nothing new"); return
    if len(out) > 4:  # more than a normal race wave at once = data reset, stay quiet
        print(f"push: {len(out)} groups changed at once, skipping to avoid spam"); return
    for rid, gid, g, k, n in out:
        head, body, teams = message(rid, gid, g, k, n, info)
        if dry:
            print(json.dumps({"headings": head["de"], "contents": body["de"], "en": body["en"], "ur": body["ur"]}, ensure_ascii=False, indent=1)); continue
        # one send per app language (tag "l"), text always in the "en" slot: works for every language,
        # also those OneSignal has no language code for. Spoiler-free users get a neutral text without the result.
        for L in LANGS:
            lv = APPL.get(L, L)
            keys = ["all"] + ["team_" + t for t in teams]
            common = {"app_id": app, "target_channel": "push", "url": f"{SITE}#round-{rid}", "web_push_topic": f"{rid}-{gid}", "ttl": 3 * 3600,
                      "chrome_web_icon": SITE + "icons/icon-192.png"}
            send(app, key_, {**common, "filters": audience(keys, lv, spoiler=False), "headings": {"en": head[L]}, "contents": {"en": body[L]}},
                 f"{rid} {gid} race {k} [{lv}]")
            send(app, key_, {**common, "filters": audience(keys, lv, spoiler=True), "headings": {"en": head[L]}, "contents": {"en": SPOILER_TXT.get(L, SPOILER_TXT["en"])}},
                 f"{rid} {gid} race {k} [{lv}, spoiler-free]")

SPOILER_TXT = {"en": "Race finished – result hidden (spoiler-free mode). Open the app when you're ready.", "de": "Rennen beendet – Ergebnis versteckt (spoilerfrei). Öffne die App, wenn du so weit bist.",
 "fr": "Course terminée – résultat masqué (sans spoiler).", "es": "Regata terminada – resultado oculto (sin spoilers).", "pt": "Regata encerrada – resultado oculto (sem spoilers).", "it": "Regata conclusa – risultato nascosto (senza spoiler). Apri l’app quando sei pronto.",
 "zh-Hans": "比赛结束 – 结果已隐藏（防剧透）。", "ar": "انتهى السباق – النتيجة مخفية (وضع بلا حرق).", "hi": "रेस खत्म – नतीजा छिपा है (स्पॉइलर-फ़्री)।", "bn": "রেস শেষ – ফল লুকানো (স্পয়লার-মুক্ত)।",
 "ur": "ریس ختم – نتیجہ چھپا ہوا ہے (اسپائلر فری)۔", "id": "Lomba selesai – hasil disembunyikan (bebas spoiler).", "ms": "Perlumbaan tamat – keputusan disembunyikan (bebas spoiler).",
 "ja": "レース終了 – 結果は非表示(ネタバレ防止)。", "th": "เรซจบแล้ว – ซ่อนผล (กันสปอยล์)", "hu": "A futam véget ért – eredmény elrejtve (spoilermentes).", "pl": "Wyścig zakończony – wynik ukryty (bez spoilerów).", "cs": "Rozjížďka skončila – výsledek skryt (bez spoilerů).", "uk": "Гонка завершилася – результат приховано (без спойлерів)."}

def quiet_ranges(now_utc_hour=None):
    """Users pick a 9-hour night quiet time; tag q = its start as UTC hour. Returns the allowed q ranges right now."""
    import datetime
    H = datetime.datetime.utcnow().hour if now_utc_hour is None else now_utc_hour
    a, b = (H + 1) % 24, (H + 15) % 24
    return [(a, b)] if a <= b else [(a, 23), (0, b)]

def audience(keys, lv, spoiler=None, extra=()):
    """OneSignal filters: (any of keys) AND language AND spoiler state AND not inside the user's quiet hours."""
    out = []
    sp = [] if spoiler is None else [{"field": "tag", "key": "spoiler", "relation": "exists" if spoiler else "not_exists"}]
    for key in keys:
        base = [{"field": "tag", "key": key, "relation": "exists"}, {"field": "tag", "key": "l", "relation": "=", "value": lv}] + sp + list(extra)
        for q in [None] + quiet_ranges():
            if out: out.append({"operator": "OR"})
            if q is None:
                out += base + [{"field": "tag", "key": "q", "relation": "not_exists"}]
            else:
                lo, hi = q
                out += base + ([{"field": "tag", "key": "q", "relation": ">", "value": str(lo - 1)}] if lo > 0 else [{"field": "tag", "key": "q", "relation": "exists"}]) \
                            + ([{"field": "tag", "key": "q", "relation": "<", "value": str(hi + 1)}] if hi < 23 else [])
    return out

def send(app, key_, payload, label):
    req = urllib.request.Request("https://api.onesignal.com/notifications?c=push", data=json.dumps(payload).encode(),
                                 headers={"Content-Type": "application/json; charset=utf-8", "Authorization": "Key " + key_}, method="POST")
    try:
        with urllib.request.urlopen(req, timeout=20) as r:
            print("push:", label, "->", r.status, r.read()[:160].decode("utf-8", "replace"))
    except Exception as e:
        print("push: send failed for", label, ":", e)

if __name__ == "__main__":
    try: main()
    except Exception as e: print("push: unexpected error:", e)
