"""Rebuild roster.json positions from three sources and write positions_report.json.

Usage (repo root):  python tools/positions/rebuild.py audit.json [xls.json]
  audit.json : output of tools/positions/audit.py (run it in GitHub Actions – the SSL sites are not reachable from the Claude container)
  xls.json   : optional {"A":[[team,name,pos,shirt,...]],"J":[[team,first,last,shirt]]} from the production sheet "Teams _ Groups 1_16.xlsx"
Rows become [name, raw position, number, [positions…]]; first position = Rio jersey (1–9), then the team page's other positions.
"""
import sys, difflib
import json,re,unicodedata,collections
NUMPOS={1:"Bow",2:"Mid-Bow",3:"Pit",4:"Grinder",5:"Trimmer",6:"Trimmer",7:"Main Trimmer",8:"Helm",9:"Tactician",11:"Floater"}
def canon(p):
  s=str(p or "").lower();out=[]
  for part in re.split(r"[/,;&]| and ",s):
    r=part.strip()
    if not r: continue
    k=None
    if re.search(r"main|mainsail",r):k="Main Trimmer"
    elif re.search(r"helm|hems",r):k="Helm"
    elif re.search(r"tact|strateg",r):k="Tactician"
    elif "grind" in r:k="Grinder"
    elif "mid" in r:k="Mid-Bow"
    elif "bow" in r:k="Bow"
    elif "pit" in r:k="Pit"
    elif "trim" in r:k="Trimmer"
    elif re.search(r"float|reserv|spare",r):k="Floater"
    if k and k not in out: out.append(k)
  return out
def iscap(p): return bool(re.search(r"capt|kapit|capit",str(p or "").lower()))
STOP={"mohd","muhamad","muhammad","mohamed","mohamad","bin","binti","de","la","del","da","dos","al","nur","abdul","van","von","the","do"}
def tok(s):
  s=unicodedata.normalize("NFD",s);s="".join(ch for ch in s if unicodedata.category(ch)!="Mn").lower()
  return [w for w in re.split(r"[^a-z]+",s) if len(w)>2 and w not in STOP]
def mscore(n,c):
  a=tok(n);b=tok(c)
  if not a or not b: return 0
  ov=len(set(a)&set(b))
  if not ov: return 0
  sur=1 if (a[-1] in b or b[-1] in a) else 0
  return ov+sur
def match(n,cands,used=None):
  best=None;bs=0
  for c in cands:
    if used is not None and c in used: continue
    s=mscore(n,c)
    if s>bs: bs=s;best=c
  return best if bs>=2 or (best and len(tok(n))==1) else None
def parse_site(t):
  if not t: return [],[]
  i=t.find("|Squad|");m=re.search(r"\|(Potential|Theoretical) Team Position\|",t,re.I)
  if i<0: return [],[]
  sq=t[i+7:m.start() if m else None].strip("|").split("|")
  rows=[]
  # groups of 4: first,last,pos,num  (num = digits or TBD/TBC/-)
  k=0
  while k+3<len(sq):
    f,l,p,n=sq[k:k+4]
    if re.fullmatch(r"\d+|TBD|TBC|-|",n.strip()):
      rows.append([(f+" "+l).strip(),p.strip(),n.strip()]);k+=4
    else: k+=1
  ch=[]
  if m:
    seg=t[m.end():];stop=seg.find("|1|",5)
    # first block only: until "|1|BOW" appears again
    j=re.search(r"\|1\|BOW",seg[3:],re.I)
    seg=seg[:j.start()+3] if j else seg[:1500]
    toks=seg.strip("|").split("|");q=0
    while q<len(toks):
      if re.fullmatch(r"\d{1,2}",toks[q]) and q+1<len(toks):
        num=int(toks[q]);pos=toks[q+1];nm=None
        if q+2<len(toks) and not re.fullmatch(r"\d{1,2}",toks[q+2]) and toks[q+2].upper()!="SQUAD":
          nm=toks[q+2];q+=3
        else: q+=2
        ch.append([num,pos,nm])
      else: q+=1
  return rows,ch
a=json.load(open(sys.argv[1]))
OLD=json.load(open('roster.json'))
TI=json.load(open('teaminfo.json'))
X=json.load(open(sys.argv[2])) if len(sys.argv)>2 else {'A':[],'J':[]}
NUMPOS={1:"Bow",2:"Mid-Bow",3:"Pit",4:"Grinder",5:"Trimmer",6:"Trimmer",7:"Main Trimmer",8:"Helm",9:"Tactician"}
POSW=re.compile(r"^(main ?trimmer|trimmer|bow|pit|helm|grinder|tactician|floater|captain|mid-?bow)$",re.I)
def norm(s):
  s=unicodedata.normalize("NFD",s);return "".join(ch for ch in s if unicodedata.category(ch)!="Mn").lower()
SYN={"honza":"jan","ondra":"ondrej","alex":"alexander","georgiy":"george","georgou":"georgeo"}
def same(x,y):
  a=[SYN.get(w,w) for w in tok(x)];b=[SYN.get(w,w) for w in tok(y)]
  if not a or not b: return 0
  ov=len(set(a)&set(b))
  if ov>=2: return 3
  # fuzzy: best surname-ish similarity
  best=0
  for p in a:
    for q in b:
      r=difflib.SequenceMatcher(None,p,q).ratio()
      if r>best: best=r
  sa=set(w[0] for w in a);sb=set(w[0] for w in b)
  if ov==1 and best>=0.99 and (len(a)==1 or len(b)==1): return 2
  if ov==1:
    rest=[difflib.SequenceMatcher(None,p,q).ratio() for p in a for q in b if p!=q]
    near=any((len(p)>=3 and len(q)>=3 and (p in q or q in p)) for p in a for q in b if p!=q)
    if (rest and max(rest)>=0.75) or near: return 2.5
    return 1
  # no exact token: two fuzzy tokens
  fz=sum(1 for p in a if max(difflib.SequenceMatcher(None,p,q).ratio() for q in b)>=0.8)
  return 2 if fz>=2 else 0
def find(nm,people,minsc=2,no=None):
  best=None;bs=0
  for p in people:
    s=max([same(nm,al) for al in p["al"]])
    if s==1 and no is not None and str(p.get("siteno"))==str(no): s=2.4
    if s>bs: bs=s;best=p
  return best if bs>=minsc else None
NEW={};REPORT={}
for code,old in OLD.items():
  site,chart=parse_site(a["teams"].get(code))
  people=[]
  rep={"removed":[],"added":[],"conf":[],"multi":[]}
  def add(nm,src,**kw):
    p={"name":nm,"al":[nm],"site":[],"sitepos":"","siteno":"","old":[],"oldpos":"","chart":[],"rio":None,"cap":False,"src":set([src])}
    p.update(kw);people.append(p);return p
  if site:
    for nm,pos,no in site:
      if re.match(r"^\d+\s",nm) or POSW.match(nm.strip()): continue
      p=find(nm,people,2.5)
      if p: p["site"]+= [k for k in canon(pos) if k not in p["site"]];p["cap"]|=iscap(pos);continue
      add(nm,"site",site=canon(pos),sitepos=pos,siteno=no,cap=iscap(pos))
  for row in old["s"]:
    nm,pos,no=row[:3]
    p=find(nm,people)
    if p: p["al"].append(nm);p["old"]+=[k for k in canon(pos) if k not in p["old"]];p["cap"]|=iscap(pos);p["src"].add("old")
    else: add(nm,"old",old=canon(pos),oldpos=pos,siteno=no,cap=iscap(pos))
  capn=old.get("c","")
  for num,pos,nm in chart:
    if not nm: continue
    names=[nm] if "/" not in nm else []
    for n in names:
      if POSW.match(n.strip()) or len(tok(n))<2: continue
      p=find(n,people)
      if p: p["al"].append(n);p["chart"]+=[k for k in canon(pos) if k not in p["chart"]];p["cap"]|=iscap(pos);p["src"].add("chart")
      else: q=add(n,"chart",chart=canon(pos),cap=iscap(pos))
  rio={c["name"]:c["no"] for c in TI.get(code,{}).get("crew",[])}
  for r in X["J"]:
    if r[0]==code and r[3]: rio.setdefault(f"{r[1]} {r[2]}",int(r[3]))
  for n,no in rio.items():
    p=find(n,people,2,no)
    if p:
      if p["rio"] is None: p["rio"]=no
      p["al"].append(n);p["src"].add("rio")
    else: add(n,"rio",rio=no)
  for r in X["A"]:
    if r[0]==code and r[2]:
      p=find(r[1],people)
      if p: p["xls"]=canon(r[2])
  for p in people:
    if norm(p["name"])==norm(capn) or any(same(capn,al)>=3 for al in p["al"]): p["cap"]=True
  # decide
  rows=[]
  for p in people:
    cur = bool(site) and ("site" in p["src"] or "chart" in p["src"] or "rio" in p["src"])
    if site and not cur and p["src"]=={"old"}:
      rep["removed"].append(p["name"]);continue
    rp=NUMPOS.get(p["rio"]) if isinstance(p["rio"],int) else None
    sitek=p["site"] or ([] if site else p["old"])
    xl=p.get("xls",[])
    prim=rp or (xl[0] if xl else None) or (p["chart"][0] if p["chart"] else None) or (sitek[0] if sitek else None)
    pool=[]
    for k in xl+p["chart"]+sitek:
      if k not in pool: pool.append(k)
    if rp and p["chart"] and rp in p["chart"] and len(sitek)==1: pool=[k for k in pool if k in p["chart"]+xl]
    ks=([prim] if prim else [])+[k for k in pool if k!=prim]
    no=str(p["rio"]) if p["rio"] else (p["siteno"] if p["siteno"] else "TBD")
    posraw=p["sitepos"] or p["oldpos"] or ("Captain" if p["cap"] else "")
    if p["cap"] and not re.search(r"capt|kapit|capit",posraw,re.I): posraw=("Captain/"+posraw) if posraw else "Captain"
    row=[p["name"],posraw,no]+([ks] if ks else [])
    rows.append(row)
    dist={k for k in [rp]+p["chart"]+sitek+xl if k}
    if len(dist)>1: rep["conf"].append({"name":p["name"],"rio":p["rio"],"rioPos":rp,"chart":p["chart"],"site":sitek,"xls":xl,"show":ks})
    if "old" not in p["src"] or (site and "site" not in p["src"] and p["src"]!={"old"}): 
      if p["src"]-{"old"} and "old" not in p["src"]: rep["added"].append((p["name"],sorted(p["src"]),p["rio"],ks))
  NEW[code]={"n":old.get("n",""),"c":old.get("c",""),"s":rows}
  REPORT[code]=rep
json.dump(NEW,open('roster.json','w'),ensure_ascii=False,separators=(',',':'))
json.dump(REPORT,open('positions_report.json','w'),ensure_ascii=False,indent=1)
print("sailors",sum(len(v["s"]) for v in NEW.values()),"was",sum(len(v["s"]) for v in OLD.values()))
print("removed",sum(len(r["removed"]) for r in REPORT.values()),"added",sum(len(r["added"]) for r in REPORT.values()),"conflicts",sum(len(r["conf"]) for r in REPORT.values()))
