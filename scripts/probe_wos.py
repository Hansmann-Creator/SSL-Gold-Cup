import json,os,re,urllib.request,time
UA={"User-Agent":"Mozilla/5.0 (compatible; GoldCupApp/1.0)","Accept":"application/json"}
def get(u):
    try:
        with urllib.request.urlopen(urllib.request.Request(u,headers=UA),timeout=60) as r:return str(r.status)+" "+r.headers.get("content-type","")+"\n"+r.read().decode("utf-8","replace")
    except urllib.error.HTTPError as e:return "HTTP "+str(e.code)+"\n"+e.read().decode("utf-8","replace")[:3000]
    except Exception as e:return "ERR "+str(e)
os.makedirs("probe",exist_ok=True)
A="https://platform.worldofsailors.com/api/"
U={"a_sailors":A+"rankings/sailors?page=1","a_sailors_g1":A+"rankings/sailors?page=1&gender=1","a_search":A+"rankings/sailors?search=wearn",
"a_search2":A+"rankings/sailors?q=wearn","a_sailor":A+"sailors/matthew-wearn","a_user":A+"users/matthew-wearn","a_sailor2":A+"sailor/matthew-wearn",
"a_nation":A+"rankings/nations","a_root":A,"w_search":"https://worldofsailors.com/ranking/men?search=smith",
"w_country":"https://worldofsailors.com/ranking/men?country=ANT","w_women_crew_p2":"https://worldofsailors.com/ranking/women?page=2"}
for k,u in U.items():
    h=get(u);open(f"probe/{k}.txt","w").write(u+"\n"+h[:600000]);time.sleep(1)
print("done")
