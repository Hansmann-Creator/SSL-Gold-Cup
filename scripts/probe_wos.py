import json,os,re,urllib.request,time
UA={"User-Agent":"Mozilla/5.0 (compatible; GoldCupApp/1.0)"}
def get(u):
    try:
        with urllib.request.urlopen(urllib.request.Request(u,headers=UA),timeout=60) as r:return r.read().decode("utf-8","replace")
    except Exception as e:return "ERR "+str(e)
def rsc(h):
    parts=re.findall(r'self\.__next_f\.push\(\[1,"(.*?)"\]\)</script>',h,re.S);o=[]
    for p in parts:
        try:o.append(json.loads('"'+p+'"'))
        except Exception:pass
    return "".join(o)
os.makedirs("probe",exist_ok=True);out={}
W="https://worldofsailors.com/ranking/men"
for p in ["crewPage","page_crew","pageCrew","crew_page","cpage","pc","page[crew]","crew"]:
    s=rsc(get(W+"?"+p+"=2"));m=re.search('"rankingCrew":',s)
    try:
        d=json.JSONDecoder().raw_decode(s,m.end())[0];L=d["lines"];out[p]=[L["current_page"],[x["position"] for x in L["data"][:3]]]
    except Exception as e: out[p]=str(e)
    time.sleep(.7)
h=get(W);js=sorted(set(re.findall(r'(/_next/static/chunks/[^"\']+\.js)',h)))
hits={}
for j in js:
    t=get("https://worldofsailors.com"+j)
    for m in re.finditer(r'.{0,160}(ranking\.type\.crew|searchParams|URLSearchParams|router\.push).{0,220}',t):
        hits.setdefault(j,[]).append(m.group(0)[:400])
out["js"]={k:v[:12] for k,v in hits.items()}
json.dump(out,open("probe/crew.json","w"),indent=1,ensure_ascii=False)
