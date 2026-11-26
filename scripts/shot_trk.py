import asyncio, sys
from playwright.async_api import async_playwright
async def main():
    async with async_playwright() as p:
        b=await p.chromium.launch(); pg=await b.new_page(viewport={"width":400,"height":860},device_scale_factor=2)
        logs=[];pg.on("console",lambda m: logs.append(m.type+": "+m.text));pg.on("pageerror",lambda e: logs.append("ERR "+str(e)))
        await pg.add_init_script("localStorage.setItem('gcmb_onb','1');localStorage.setItem('gcmb_splash_a','1');localStorage.setItem('gcmb_lang','\"en\"')")
        await pg.goto("http://localhost:8000/index.html"); await pg.wait_for_timeout(3000)
        await pg.evaluate("window.gcmbTrack('https://player.georacing.com/?event=102233&race=103496&application_id=46')")
        await pg.wait_for_timeout(9000); await pg.screenshot(path="shots/t1.png")
        await pg.evaluate("document.querySelector('#tksp').click();document.querySelector('#tksp').click();document.querySelector('#tkr').value=String(+document.querySelector('#tkr').min+ (document.querySelector('#tkr').max-document.querySelector('#tkr').min)*0.45);document.querySelector('#tkr').dispatchEvent(new Event('input'));document.querySelector('#tkpl').click()")
        await pg.wait_for_timeout(4000); await pg.screenshot(path="shots/t2.png")
        await pg.evaluate("document.querySelector('#tkr').value=document.querySelector('#tkr').max;document.querySelector('#tkr').dispatchEvent(new Event('input'))")
        await pg.wait_for_timeout(1500); await pg.screenshot(path="shots/t3.png")
        await pg.evaluate("window.gcmbTrack('https://player.georacing.com/?event=102235&race=%s&application_id=46')" % sys.argv[1])
        await pg.wait_for_timeout(6000); await pg.screenshot(path="shots/t4.png")
        print("\n".join(logs[-30:]))
        await b.close()
asyncio.run(main())
