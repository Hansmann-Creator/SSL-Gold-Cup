import urllib.request, json, os, re
UA={"User-Agent":"Mozilla/5.0 (Linux; Android 14) AppleWebKit/537.36 Chrome/131 Mobile Safari/537.36"}
def get(u):
    try: return urllib.request.urlopen(urllib.request.Request(u,headers=UA),timeout=40).read().decode("utf-8","replace")
    except Exception as e: return "ERR "+str(e)
os.makedirs("o",exist_ok=True); out={}
t=get("https://worldofsailors.com/ranking/nation")
for j in sorted(set(re.findall(r'"(/_next/static/chunks/[^"]+\.js)"',t))):
    s=get("https://worldofsailors.com"+j)
    hits=[m.start() for m in re.finditer(r'weeks|rankings/|continent|historical|Historical',s)]
    if hits:
        open("o/chunk_"+re.sub(r"[^a-z0-9]+","_",j.lower())[-50:]+".js","w").write(s)
        out[j]=[s[max(0,h-200):h+200] for h in hits[:12]]
def top(t):
    i=t.find('<table class="false');rows=re.findall(r'<tr.*?</tr>',t[i:t.find('</table>',i)],re.S)[1:6]
    return [re.sub(r"<[^>]+>","|",r)[:0]+" ".join(re.findall(r'<td[^>]*>(\d+)</td>',r)[:2])+" "+(re.findall(r'uppercase mb-0">([^<]+)<',r) or ["?"])[0] for r in rows]
for q in ["","?date=2026-01-06","?week=2026-01-06","?historical=2026-01-06","?continent=europe","?continent=3","?country=GBR","?country=great-britain"]:
    out["page"+q]=top(get("https://worldofsailors.com/ranking/nation"+q))
json.dump(out,open("o/probe.json","w"),indent=1)
print(json.dumps({k:v for k,v in out.items() if k.startswith("page")},indent=1))
