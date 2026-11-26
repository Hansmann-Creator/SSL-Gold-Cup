"""Export every UI text per language for proofreading, and check that no language misses a text.

Usage (repo root, local server on :8011):  python3 tools/i18n/export.py [--check]
Writes i18n/export/<lang>.csv with columns: key, English, translation (functions are shown as code with ${…} placeholders).
--check only prints missing texts and exits 1 if any language lacks a key (used by scripts/smoke.py).
"""
import asyncio, csv, json, os, sys
from playwright.async_api import async_playwright
JS = """(()=>{const ser=v=>typeof v=='function'?v.toString():Array.isArray(v)?v.map(ser):v&&typeof v=='object'?Object.fromEntries(Object.entries(v).map(([k,x])=>[k,ser(x)])):v;
return {S:ser(window.__S),D:ser(window.__D)}})()"""
def flat(v, p=""):
    if isinstance(v, dict):
        for k, x in v.items(): yield from flat(x, f"{p}.{k}" if p else k)
    elif isinstance(v, list):
        for i, x in enumerate(v): yield from flat(x, f"{p}[{i}]")
    else: yield p, v
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(executable_path="/usr/bin/google-chrome") if os.path.exists("/usr/bin/google-chrome") else await p.chromium.launch()
        pg = await (await b.new_context()).new_page()
        await pg.goto("http://localhost:8011/?i18ncheck=1"); await pg.wait_for_timeout(2500)
        d = await pg.evaluate(JS); await b.close()
    langs = list(d["D"]["LANGS"].keys())
    rows = {l: [] for l in langs}; miss = {}
    en = dict(flat(d["S"]["en"]))
    for l in langs:
        tr = dict(flat(d["S"].get(l, {})))
        for k, v in en.items():
            if k not in tr: miss.setdefault(l, []).append("S." + k)
            rows[l].append(["S." + k, v, tr.get(k, "")])
    for n, o in d["D"].items():
        if n in ("LANGS", "MO") or not isinstance(o, dict): continue  # MO: other languages use Intl month names
        groups = o.items() if n == "FIX" else [("", o)]
        for sub, g in groups:
            if not isinstance(g, dict) or "en" not in g: continue
            ef = dict(flat(g["en"]))
            for l in langs:
                lf = dict(flat(g.get(l))) if l in g else {}
                for k, v in ef.items():
                    key = f"{n}{'.'+sub if sub else ''}{'.'+k if k else ''}"
                    if l not in g or k not in lf: miss.setdefault(l, []).append(key)
                    rows[l].append([key, v, lf.get(k, "")])
    if "--check" in sys.argv:
        for l, m in miss.items(): print(f"i18n {l}: {len(m)} missing – {', '.join(m[:8])}")
        sys.exit(0)
    os.makedirs("i18n/export", exist_ok=True)
    for l in langs:
        with open(f"i18n/export/{l}.csv", "w", newline="", encoding="utf-8") as f:
            w = csv.writer(f); w.writerow(["key", "English", d["D"]["LANGS"][l]]); w.writerows(rows[l])
    print("exported", len(langs), "languages;", {l: len(m) for l, m in miss.items()})
asyncio.run(main())
