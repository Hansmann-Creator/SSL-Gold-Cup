import asyncio
from playwright.async_api import async_playwright
B="https://hansmann-creator.github.io/SSL-Gold-Cup/"
async def main():
    async with async_playwright() as p:
        b=await p.chromium.launch(); ctx=await b.new_context(viewport={"width":390,"height":844},device_scale_factor=1.5,color_scheme="dark",is_mobile=True,has_touch=True)
        pg=await ctx.new_page();logs=[];pg.on("pageerror",lambda e: logs.append("ERR "+str(e)))
        await pg.add_init_script("localStorage.setItem('gcmb_onb','1');localStorage.setItem('gcmb_splash_a','1');localStorage.setItem('gcmb_lang','\"en\"')")
        await pg.goto(B+"#home"); await pg.wait_for_timeout(4000); await pg.screenshot(path="shots/p_home.png")
        await pg.evaluate("window.gcmbTrack('https://player.georacing.com/?event=102234&race=103500&application_id=46')"); await pg.wait_for_timeout(9000)
        await pg.evaluate("const R=document.querySelector('#tkr');if(R){R.value=String(+R.min+(R.max-R.min)*0.5);R.dispatchEvent(new Event('input'))}"); await pg.wait_for_timeout(1500)
        await pg.screenshot(path="shots/p_trk.png")
        await pg.evaluate("document.querySelector('#tmd').close()")
        await pg.evaluate("document.querySelector('[data-live]')&&document.querySelector('[data-live]').click()"); await pg.wait_for_timeout(3000); await pg.screenshot(path="shots/p_live.png")
        await pg.evaluate("document.querySelector('[data-lvplay]')&&document.querySelector('[data-lvplay]').click()"); await pg.wait_for_timeout(5000); await pg.screenshot(path="shots/p_live2.png")
        print("\n".join(logs))
        await b.close()
asyncio.run(main())
