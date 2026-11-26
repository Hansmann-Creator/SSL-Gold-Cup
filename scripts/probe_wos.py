import json,os,re,sys,urllib.request,time
UA={"User-Agent":"Mozilla/5.0 (compatible; GoldCupApp/1.0)"}
def get(u):
    try:
        with urllib.request.urlopen(urllib.request.Request(u,headers=UA),timeout=60) as r:return r.read().decode("utf-8","replace")
    except Exception as e:return "ERR "+str(e)
def rsc(h):
    parts=re.findall(r'self\.__next_f\.push\(\[1,"(.*?)"\]\)</script>',h,re.S)
    out=[]
    for p in parts:
        try:out.append(json.loads('"'+p+'"'))
        except Exception:pass
    return "".join(out)
os.makedirs("probe",exist_ok=True)
U={"men":"https://worldofsailors.com/ranking/men","men_p2":"https://worldofsailors.com/ranking/men?page=2","women":"https://worldofsailors.com/ranking/women",
 "men_crew":"https://worldofsailors.com/ranking/men?type=ranking.type.crew","rank_hub":"https://worldofsailors.com/ranking","stats":"https://worldofsailors.com/ranking/statistics",
 "s_wearn":"https://worldofsailors.com/sailor/matthew-wearn","s_dejager":"https://worldofsailors.com/sailor/giles-de-jager","s_gordon":"https://worldofsailors.com/sailor/jalese-gordon",
 "s_plasschaert":"https://worldofsailors.com/sailor/emma-plasschaert"}
for k,u in U.items():
    h=get(u);s=rsc(h)
    open(f"probe/{k}.html","w").write(h[:400000])
    open(f"probe/{k}.rsc.txt","w").write(s[:1500000])
    hrefs=sorted(set(re.findall(r'href="([^"]+)"',h)))
    open(f"probe/{k}.hrefs.txt","w").write("\n".join(hrefs))
    time.sleep(1)
print("done")
