"""Race reports from the shared Google Drive folder 02_Race-Reports (must be 'anyone with the link can view').
Reads the public folder listing, maps each file name to a race key (e.g. 'R16 Group A Race 1', '1-16 A1', 'Gruppe A Rennen 1'),
downloads Google Docs (as HTML), Word, PDF or text files and writes reports.json {key: {html, title, src}}.
Prints 'changed' when reports.json changed."""
import json, os, re, sys, io, urllib.request, html as H, datetime
from bs4 import BeautifulSoup
FOLDER = "14XyNTwjimpGGTBownb5OfLyRfnowU3IF"
UA = {"User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/131 Safari/537.36"}
def get(u, binary=False):
    r = urllib.request.urlopen(urllib.request.Request(u, headers=UA), timeout=30)
    b = r.read(); return (b, r.headers.get("Content-Type", "")) if binary else b.decode("utf-8", "replace")
ROOT = os.path.join(os.path.dirname(__file__), "..")
ROUNDS = [(r"\b(1\s*[/_-]\s*32|r\s*32|32)\b", "r32"), (r"\b(1\s*[/_-]\s*16|r\s*16|16)\b", "r16"), (r"\b(1\s*[/_-]\s*8|r\s*8|ef|eighth)\b", "r8"),
          (r"\b(1\s*[/_-]\s*4|r\s*4|qf|quarter)", "r4"), (r"\b(1\s*[/_-]\s*2|sf|semi)", "sf"), (r"petit", "pf"), (r"(grand\s*)?final\b", "f")]
SCHED = {"r32": ("2026-11-19", "2026-11-22"), "r16": ("2026-11-26", "2026-11-29"), "r8": ("2026-12-02", "2026-12-05"), "r4": ("2026-12-07", "2026-12-10"), "sf": ("2026-12-12", "2026-12-12")}
def current_round(today):
    for rid, (a, b) in SCHED.items():
        if a <= today <= b: return rid
    past = [rid for rid, (a, b) in SCHED.items() if b < today]
    return past[-1] if past else "r32"
def key_of(name, today):
    n = name.lower().replace("_", " ")
    rid = next((r for p, r in ROUNDS if re.search(p, n)), None)
    if rid in ("pf", "f"): return f"{rid}|A|1"
    g = re.search(r"(?:group|gruppe|grupo|groupe|grp|\bg)\s*([a-d])\b", n) or re.search(r"\b([a-d])\s*[-]?\s*(?:race|rennen|r)?\s*([1-4])\b", n)
    rc = re.search(r"(?:race|rennen|regata|course|\br)\s*([1-4])\b", n)
    if not g: return None
    grp = g.group(1).upper(); num = rc.group(1) if rc else (g.group(2) if g.lastindex and g.lastindex > 1 else ("1" if rid == "sf" else None))
    if not num: return None
    return f"{rid or current_round(today)}|{grp}|{num}"
OK = {"p", "h1", "h2", "h3", "h4", "ul", "ol", "li", "blockquote", "strong", "em", "b", "i", "br", "img"}
def clean_html(soup_node):
    out = []
    def walk(n):
        for c in n.children:
            if getattr(c, "name", None) is None: out.append(H.escape(str(c)))
            elif c.name in ("script", "style", "head", "title", "meta"): continue
            elif c.name == "img":
                s = c.get("src") or ""
                if s.startswith("http"): out.append(f'<img src="{H.escape(s)}" alt="" loading="lazy">')
            elif c.name in OK:
                tag = {"b": "strong", "i": "em", "h1": "h2", "h4": "h3"}.get(c.name, c.name)
                out.append("<br>" if tag == "br" else f"<{tag}>"); walk(c); out.append("" if tag == "br" else f"</{tag}>")
            elif c.name == "span" and "font-weight:700" in (c.get("style") or "").replace(" ", ""):
                out.append("<strong>"); walk(c); out.append("</strong>")
            else: walk(c)
    walk(soup_node)
    h = re.sub(r"\s+", " ", "".join(out)); h = re.sub(r"<(p|li|h2|h3)>\s*</\1>", "", h)
    return h.strip()
def text_to_html(t):
    paras = [p.strip() for p in re.split(r"\n\s*\n", t.replace("\r", "")) if p.strip()]
    return "".join(f"<p>{H.escape(p).replace(chr(10), '<br>')}</p>" for p in paras)
def fetch(fid, kind):
    if kind == "doc":
        h = get(f"https://docs.google.com/document/d/{fid}/export?format=html")
        return clean_html(BeautifulSoup(h, "html.parser").body or BeautifulSoup(h, "html.parser"))
    b, ct = get(f"https://drive.google.com/uc?export=download&id={fid}", True)
    if b[:4] == b"%PDF":
        import subprocess, tempfile
        with tempfile.NamedTemporaryFile(suffix=".pdf") as f:
            f.write(b); f.flush(); t = subprocess.run(["pdftotext", "-layout", f.name, "-"], capture_output=True, text=True).stdout
        t = re.sub(r"[ \t]{2,}", " ", t); return text_to_html(t)
    if b[:2] == b"PK":
        import docx
        d = docx.Document(io.BytesIO(b)); out = []
        for p in d.paragraphs:
            if not p.text.strip(): continue
            st = (p.style.name or "").lower()
            tag = "h3" if "heading" in st or "title" in st else "p"
            out.append(f"<{tag}>{H.escape(p.text.strip())}</{tag}>")
        return "".join(out)
    return text_to_html(b.decode("utf-8", "replace"))
def main():
    today = (datetime.datetime.utcnow() - datetime.timedelta(hours=3)).strftime("%Y-%m-%d")
    path = os.path.join(ROOT, "reports.json")
    old = json.load(open(path)) if os.path.exists(path) else {}
    try: page = get(f"https://drive.google.com/embeddedfolderview?id={FOLDER}#list")
    except Exception as ex: print("reports: folder not readable (is it shared 'anyone with the link'?)", ex); sys.exit(1)
    S = BeautifulSoup(page, "html.parser"); found = []
    for a in S.select(".flip-entry a, a[href]"):
        href = a.get("href") or ""; t = a.select_one(".flip-entry-title")
        title = (t.get_text(strip=True) if t else a.get_text(strip=True)) or ""
        m = re.search(r"/document/d/([\w-]{20,})", href); kind = "doc"
        if not m: m = re.search(r"/file/d/([\w-]{20,})", href); kind = "file"
        if m and title: found.append((m.group(1), kind, title))
    new = dict(old)
    for fid, kind, title in found:
        k = key_of(re.sub(r"\.(pdf|docx?|txt|md)$", "", title, flags=re.I), today)
        if not k: print("skip (name not understood):", title); continue
        try: h = fetch(fid, kind)
        except Exception as ex: print("fetch failed", title, ex); continue
        if h: new[k] = {"html": h[:80000], "title": title, "src": fid}
        print("report", k, "<-", title, len(h))
    if json.dumps(new, sort_keys=True) != json.dumps(old, sort_keys=True):
        json.dump(new, open(path, "w"), ensure_ascii=False, separators=(",", ":")); print("changed", len(new))
    else: print("same", len(new))
if __name__ == "__main__":
    if len(sys.argv) > 1 and sys.argv[1] == "--test":
        for n in ["R16 Group A Race 1", "1-16 A1", "Gruppe B Rennen 2", "Race 1 - Group C", "Report_1_16_GroupD_Race1.pdf", "QF A2", "Grand Final", "Petit Final", "SF Group B", "Group A R3"]:
            print(n, "->", key_of(re.sub(r"\.(pdf|docx?|txt|md)$", "", n, flags=re.I), "2026-11-26"))
    else: main()
