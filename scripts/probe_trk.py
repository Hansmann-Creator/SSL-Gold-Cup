import json, urllib.request, asyncio, sys
from playwright.async_api import async_playwright
get=lambda u: json.load(urllib.request.urlopen(urllib.request.Request(u,headers={"User-Agent":"Mozilla/5.0"}),timeout=20))
app=get("https://player.georacing.com/datas/applications/app_46.json")
evs=[e for e in app["events"] if "2026" in e.get("name","")]
for e in evs: print("EV",e["id"],e["name"])
q=[e for e in evs if "Qualif" in e["name"]] or evs
races=get(f"https://player.georacing.com/datas/{q[0]['id']}/races.json")
r=[x for x in races if x.get("name","").startswith("Race")][0]
print("RACE",json.dumps(r)[:800])
url=f"https://player.georacing.com/{r.get('player_name') or ''}?event={q[0]['id']}&race={r['id']}&application_id=46"
print("URL",url)
async def main():
    async with async_playwright() as p:
        b=await p.chromium.launch(); pg=await b.new_page(viewport={"width":400,"height":800})
        log=[]
        async def onresp(res):
            try:
                ct=res.headers.get("content-type",""); body=await res.body()
                log.append((res.url,ct,len(body),body[:300]))
            except Exception as ex: log.append((res.url,"ERR",0,b""))
        pg.on("response",lambda r: asyncio.ensure_future(onresp(r)))
        pg.on("websocket",lambda ws: print("WS",ws.url))
        await pg.goto(url); await pg.wait_for_timeout(15000)
        for u,ct,n,b0 in log:
            if any(x in u for x in (".png",".jpg",".woff",".svg",".css","tile","arcgis")): continue
            print("R",n,ct[:30],u[:220]); 
            if "json" in ct or "octet" in ct or "datas" in u: print("   ",repr(b0[:300]))
        await b.close()
asyncio.run(main())
