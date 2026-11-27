#!/usr/bin/env python3
"""Replay: for each race today with a real (Georacing) start, load the app at start-20/-10/-5 min with the
timing.json + results.json that were in the repo at that moment, and read the start time the app shows."""
from playwright.sync_api import sync_playwright
import subprocess,json,datetime,re,sys
D=sys.argv[1] if len(sys.argv)>1 else "2026-11-27"
def at_commit(path,iso):
  c=subprocess.run(['git','log','origin/main','--format=%H','--until='+iso,'-1','--',path],capture_output=True,text=True).stdout.strip()
  return subprocess.run(['git','show',c+':'+path],capture_output=True,text=True).stdout
T=json.loads(open('timing.json').read())
races=[(k,v) for k,v in T['races'].items() if v.get('s') and v['s'].startswith(D)]
races.sort(key=lambda kv:kv[1]['s'])
def F(b):return lambda r:r.fulfill(body=b,content_type="application/json",headers={"Access-Control-Allow-Origin":"*"})
P=lambda s:datetime.datetime.fromisoformat(s.replace("Z","+00:00"))
out=[]
with sync_playwright() as p:
  b=p.chromium.launch(executable_path="/usr/bin/google-chrome")
  for k,v in races:
    s=P(v['s'])
    for m in (20,10,5):
      t=s-datetime.timedelta(minutes=m);iso=t.strftime("%Y-%m-%dT%H:%M:%SZ")
      tj=at_commit('timing.json',iso);rj=at_commit('results.json',iso);fj=at_commit('flags.json',iso) or '{}';sj=at_commit('sched.json',iso)
      pg=b.new_page(viewport={"width":390,"height":900})
      pg.add_init_script("localStorage.setItem('gcmb_lang',JSON.stringify('de'));localStorage.setItem('gcmb_installed','1')")
      pg.clock.install(time=iso)
      pg.route("**/timing.json*",F(tj));pg.route("**/results.json*",F(rj));pg.route("**/flags.json*",F(fj));pg.route("**/sched.json*",F(sj))
      pg.route("**/data-live.georacing.com/**",F("[]"));pg.route("**/trk/*.json*",F("{}"))
      pg.goto("http://localhost:8011/?gcskip=1");pg.wait_for_timeout(2500)
      txt=pg.evaluate("(k)=>{const li=document.querySelector(`.races li.rc[data-race='${k}']`);return li?li.querySelector('.ti').innerText.replace(/\\n/g,' '):'?'}",k)
      pg.close()
      mt=re.search(r'~?(\d{1,2}):(\d{2})',txt)
      shown=None
      if mt:shown=t.replace(hour=(int(mt.group(1))+3)%24,minute=int(mt.group(2)),second=0)
      err=round((shown-s).total_seconds()/60,1) if shown else None
      out.append((k,(s-datetime.timedelta(hours=3)).strftime('%H:%M:%S'),f"-{m} min",txt,err))
  b.close()
for o in out:print(f"{o[0]:10} Start {o[1]}  {o[2]:>7}: App zeigt '{o[3]}'  Abweichung {o[4]} min")
