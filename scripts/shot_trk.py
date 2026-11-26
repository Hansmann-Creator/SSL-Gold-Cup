import asyncio
from playwright.async_api import async_playwright
async def main():
    async with async_playwright() as p:
        b=await p.chromium.launch(); ctx=await b.new_context(viewport={"width":390,"height":844},device_scale_factor=1.5,color_scheme="dark",has_touch=True,is_mobile=True)
        pg=await ctx.new_page()
        logs=[];pg.on("console",lambda m: logs.append(m.type+": "+m.text) if m.type in("error","warning") else None);pg.on("pageerror",lambda e: logs.append("ERR "+str(e)))
        await pg.add_init_script("localStorage.setItem('gcmb_onb','1');localStorage.setItem('gcmb_splash_a','1');localStorage.setItem('gcmb_lang','\"en\"');localStorage.setItem('gcmb_favs','[\"HUN\"]');localStorage.setItem('gcmb_sfavs','[\"HUN|Zsombor Berecz\"]')")
        async def shot(name,full=True):
            await pg.wait_for_timeout(1200); await pg.screenshot(path=f"shots/{name}.png",full_page=full)
        for v in ["home","round-r16","bracket","teams","sailors","more"]:
            await pg.goto(f"http://localhost:8000/index.html#{v}"); await pg.wait_for_timeout(2500); await shot(v)
        await pg.goto("http://localhost:8000/index.html#home"); await pg.wait_for_timeout(2500)
        await pg.evaluate("document.querySelector('[data-race],.rrow,[data-rx]')&&document.querySelector('[data-race],.rrow,[data-rx]').click()"); await shot("race",False)
        await pg.evaluate("const d=document.querySelector('#tmd');d.scrollTop=9999"); await shot("race2",False)
        await pg.evaluate("document.querySelector('#tmd').close()")
        await pg.goto("http://localhost:8000/index.html#team-HUN"); await pg.wait_for_timeout(2500); await shot("team",False)
        await pg.evaluate("const d=document.querySelector('#tmd');d.scrollTop=700"); await shot("team2",False)
        await pg.evaluate("document.querySelector('#tmd [data-pi]')&&document.querySelector('#tmd [data-pi]').click()"); await shot("sailor",False)
        await pg.evaluate("const d=document.querySelector('#tmd');d.scrollTop=650"); await shot("sailor2",False)
        await pg.evaluate("const d=document.querySelector('#tmd');d.scrollTop=1400"); await shot("sailor3",False)
        print("\n".join(logs[-40:]))
        html=await pg.evaluate("document.querySelector('#main').innerHTML.length"); print("main len",html)
        await b.close()
asyncio.run(main())
