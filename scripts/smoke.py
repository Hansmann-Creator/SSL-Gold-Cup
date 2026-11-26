#!/usr/bin/env python3
"""Smoke test: open every view in several languages and themes; fail on any JS error or horizontal overflow."""
import asyncio, sys, subprocess, time, os
from playwright.async_api import async_playwright

ROOT = os.path.join(os.path.dirname(__file__), "..")
VIEWS = ["", "#round-r32", "#round-r16", "#bracket", "#qualifying", "#gc2023", "#teams", "#sailors", "#more", "#team-POR", "#team-HUN", "#ranking", "#changes"]
LANGS = [("en", "auto"), ("it", "light"), ("ja", "dark"), ("hu", "light"), ("de", "light"), ("ar", "dark"), ("zh", "auto"), ("ur", "auto"), ("hi", "light"), ("pl", "auto")]


async def main():
    srv = subprocess.Popen([sys.executable, "-m", "http.server", "8765"], cwd=ROOT, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    time.sleep(1.5)
    bad = []
    try:
        async with async_playwright() as p:
            b = await p.chromium.launch()
            for lang, theme in LANGS:
                ctx = await b.new_context(viewport={"width": 390, "height": 844})
                await ctx.add_init_script(f'localStorage.setItem("gcmb_lang",JSON.stringify("{lang}"));localStorage.setItem("gcmb_theme",JSON.stringify("{theme}"))')
                pg = await ctx.new_page()
                errs = []
                pg.on("pageerror", lambda e: errs.append(str(e)))
                for v in VIEWS:
                    errs.clear()
                    await pg.goto("http://localhost:8765/index.html" + v)
                    await pg.wait_for_timeout(700)
                    n = await pg.evaluate("document.querySelectorAll('#main *').length")
                    w = await pg.evaluate("document.documentElement.scrollWidth")
                    if errs or n < 5 or w > 392:
                        bad.append(f"{lang} {v or 'home'}: errors={errs[:2]} nodes={n} width={w}")
                    print(f"ok? {lang:2} {v or 'home':14} nodes={n} width={w} errors={len(errs)}")
                await ctx.close()
            await b.close()
    finally:
        srv.terminate()
    if bad:
        print("FAILED:\n" + "\n".join(bad))
        sys.exit(1)
    print("all views fine")


asyncio.run(main())
