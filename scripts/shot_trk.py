import asyncio, json
from playwright.async_api import async_playwright
U=["https://player.georacing.com/datas/102233/103496/all.json","https://player.georacing.com/datas/102233/103496/stats.json",
"https://player.georacing.com/datas/102233/103496/positions/2026_11_15__r.json","https://player.georacing.com/datas/102233/103496/positions/2026_11_15__r1__positions.bin",
"https://data-live.georacing.com/datas/102233/103496/live.json","https://data-live.georacing.com/datas/102233/103496/all.json","https://data-live.georacing.com/datas/102233/103496/pull.json",
"https://player.georacing.com/datas/applications/app_46.json","https://player.georacing.com/datas/102235/races.json"]
async def main():
    async with async_playwright() as p:
        b=await p.chromium.launch(); pg=await b.new_page()
        await pg.goto("https://hansmann-creator.github.io/SSL-Gold-Cup/"); await pg.wait_for_timeout(1500)
        for u in U:
            for mode in ("default","no-store"):
                r=await pg.evaluate("async([u,m])=>{try{const r=await fetch(u,{cache:m});const t=await r.arrayBuffer();return r.status+' '+t.byteLength}catch(e){return 'FAIL '+e}}",[u,mode])
                print(mode,r,u)
        await b.close()
asyncio.run(main())
