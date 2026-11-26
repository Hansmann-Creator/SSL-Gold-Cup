import urllib.request, json, os
UA={"User-Agent":"Mozilla/5.0","Accept":"application/json","Origin":"https://hansmann-creator.github.io"}
os.makedirs("o",exist_ok=True); out={}
B="https://platform.worldofsailors.com/api/rankings/nations"
for q in ["","?date=2026-11-17","?week=2026-11-17","?start_week_date=2026-11-17","?ranking_date=2026-11-17","?continent=3","?continent_id=3","?per_page=200","?date=2026-01-06"]:
    u=B+q
    try:
        r=urllib.request.urlopen(urllib.request.Request(u,headers=UA),timeout=40); b=r.read(); h=dict(r.headers)
        try:
            j=json.loads(b); d=j.get("data",j); items=d.get("data") if isinstance(d,dict) else d
            info={"status":r.status,"cors":h.get("Access-Control-Allow-Origin"),"keys":list(j)[:20],"n":len(items) if items else None,
                  "first":json.dumps(items[0])[:3000] if items else None,"top5":[(i.get("rank"),i.get("country",{}).get("name") if isinstance(i.get("country"),dict) else None,i.get("points")) for i in (items or [])[:5]]}
            if q=="": open("o/nations.json","wb").write(b)
        except Exception as e: info={"status":r.status,"cors":h.get("Access-Control-Allow-Origin"),"raw":b[:500].decode("utf-8","replace")}
    except Exception as e: info={"err":str(e)}
    out[q]=info; print(q, {k:v for k,v in info.items() if k!="first"})
json.dump(out,open("o/probe.json","w"),indent=1)
