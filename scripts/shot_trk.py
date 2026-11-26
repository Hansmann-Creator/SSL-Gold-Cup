import asyncio, json, urllib.request
from playwright.async_api import async_playwright
H={"User-Agent":"Mozilla/5.0 Chrome/131","Referer":"https://player.georacing.com/"}
rs=json.load(urllib.request.urlopen(urllib.request.Request("https://player.georacing.com/datas/102234/races.json",headers=H)))
r=[x for x in rs if x["name"].startswith("Race 1 - Group A")][0]; print("R32 race",r["id"],r["name"],r["start_time"])
r16=json.load(urllib.request.urlopen(urllib.request.Request("https://player.georacing.com/datas/102235/races.json",headers=H)))
u16=[x for x in r16 if x["name"].startswith("Race 1 - Group A")][0]
async def main():
    async with async_playwright() as p:
        b=await p.chromium.launch(); pg=await b.new_page(viewport={"width":400,"height":860},device_scale_factor=2)
        logs=[];pg.on("console",lambda m: logs.append(m.type+": "+m.text));pg.on("pageerror",lambda e: logs.append("ERR "+str(e)))
        await pg.add_init_script("localStorage.setItem('gcmb_onb','1');localStorage.setItem('gcmb_splash_a','1');localStorage.setItem('gcmb_lang','\"en\"')")
        await pg.goto("http://localhost:8000/index.html"); await pg.wait_for_timeout(3000)
        print("LIVEJSON", await pg.evaluate("fetch('https://data-live.georacing.com/datas/102233/103496/live.json').then(r=>r.text()).then(t=>t.slice(0,900))"))
        await pg.evaluate(f"window.gcmbTrack('https://player.georacing.com/?event=102234&race={r['id']}&application_id=46')")
        await pg.wait_for_timeout(10000); await pg.screenshot(path="shots/t1.png")
        await pg.evaluate("const R=document.querySelector('#tkr');R.value=String(+R.min+(R.max-R.min)*0.4);R.dispatchEvent(new Event('input'));document.querySelector('#tksp').click();document.querySelector('#tkpl').click()")
        await pg.wait_for_timeout(4000); await pg.screenshot(path="shots/t2.png")
        await pg.evaluate("const R=document.querySelector('#tkr');R.value=R.max;R.dispatchEvent(new Event('input'))")
        await pg.wait_for_timeout(1500); await pg.screenshot(path="shots/t3.png")
        await pg.evaluate(f"window.gcmbTrack('https://player.georacing.com/?event=102235&race={u16['id']}&application_id=46')")
        await pg.wait_for_timeout(6000); await pg.screenshot(path="shots/t4.png")
        # sailor profile
        await pg.evaluate("document.querySelector('#tmd').close()")
        print("\n".join(logs[-30:]))
        await b.close()
asyncio.run(main())
