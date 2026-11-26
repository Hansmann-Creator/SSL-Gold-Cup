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
W="https://worldofsailors.com/ranking/"
U={"search":W+"men?search=smith","search2":W+"men?name=smith","country":W+"men?country=ANT","country2":W+"men?country_id=8","women_p2":W+"women?page=2",
 "crew_p2":W+"men?page=2&type=ranking.type.crew","date":W+"men?date=2026-11-17","cls":W+"men?class=6","global":W+"global"}
for k,u in U.items():
    s=rsc(get(u));r={}
    for name in ["rankingSkipper","rankingCrew"]:
        m=re.search('"%s":'%name,s)
        if not m: continue
        try:d=json.JSONDecoder().raw_decode(s,m.end())[0]
        except Exception as e: r[name]="ERR";continue
        L=d.get("lines") or {}
        r[name]={"date":d.get("date"),"page":L.get("current_page"),"total":L.get("total"),"rows":[(x.get("position"),x.get("points"),x.get("before_position"),(x.get("sailor") or {}).get("username"),((x.get("sailor") or {}).get("country") or {}).get("code_ssl"),(x.get("sailor") or {}).get("gender")) for x in (L.get("data") or [])[:6]]}
    out[k]=r;time.sleep(1)
# filters available on the page
s=rsc(get(W+"men"))
for key in ["countries","competitionClasses","filters","genders","searchParams"]:
    m=re.search('"%s":'%key,s)
    if m: out["key_"+key]=s[m.start():m.start()+600]
json.dump(out,open("probe/filters.json","w"),indent=1,ensure_ascii=False)
print("done")
