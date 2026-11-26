import urllib.request, re, json, os
UA={"User-Agent":"Mozilla/5.0 (Linux; Android 14) AppleWebKit/537.36 Chrome/131 Mobile Safari/537.36","Accept":"text/html,application/json"}
def get(u):
    try:
        r=urllib.request.urlopen(urllib.request.Request(u,headers=UA),timeout=30); return r.status, r.read().decode("utf-8","replace")
    except urllib.error.HTTPError as e: return e.code, e.read().decode("utf-8","replace")[:3000]
    except Exception as e: return 0,str(e)
os.makedirs("o",exist_ok=True)
for name,u in [("nation","https://worldofsailors.com/ranking/nation"),("indiv","https://worldofsailors.com/ranking"),("nation_p2","https://worldofsailors.com/ranking/nation?page=2")]:
    s,t=get(u); open(f"o/{name}.html","w").write(t); print(name,s,len(t))
    js=set(re.findall(r'src="([^"]+\.js[^"]*)"',t)); print(js)
    for j in list(js)[:12]:
        url=j if j.startswith("http") else "https://worldofsailors.com"+("" if j.startswith("/") else "/")+j
        s2,t2=get(url); fn="o/js_"+re.sub(r"[^a-z0-9]+","_",j.lower())[-60:]
        open(fn,"w").write(t2); print(" js",url,s2,len(t2))
