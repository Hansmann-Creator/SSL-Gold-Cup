"""Mirror the latest news from worldofsailors.com into news.json so the app can show them in-app.
List: home page cards (/news/<slug>: title, date, teaser, image). Article: og meta + the main text block,
reduced to simple safe HTML (p, h2, h3, ul/li, blockquote, strong, em, img). Prints 'changed' when news.json changed."""
import json, re, os, sys, urllib.request, urllib.parse, html as H
from bs4 import BeautifulSoup
BASE = "https://worldofsailors.com"
UA = {"User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/131 Safari/537.36"}
get = lambda u: urllib.request.urlopen(urllib.request.Request(u, headers=UA), timeout=25).read().decode("utf-8", "replace")
def real_img(src):
    if not src: return ""
    if src.startswith("/_next/image"):
        q = urllib.parse.parse_qs(urllib.parse.urlparse(src).query).get("url", [""])[0]
        return q
    return urllib.parse.urljoin(BASE, src)
def cards(home):
    S = BeautifulSoup(home, "html.parser"); out, seen = [], set()
    for a in S.select('h3 a[href^="/news/"]'):
        slug = a["href"].split("/news/", 1)[1].strip("/")
        if not slug or slug in seen or slug.startswith("results"): continue
        seen.add(slug); art = a.find_parent(["article", "div"])
        while art is not None and not art.select_one("img"): art = art.find_parent(["article", "div"])
        im = art.select_one("img") if art else None
        dt = art.select_one(".post-date") if art else None
        tx = art.select_one("h3 + div") if art else None
        out.append({"slug": slug, "t": a.get("title") or a.get_text(strip=True), "d": dt.get_text(strip=True) if dt else "",
                    "img": real_img(im.get("src") if im else ""), "x": re.sub(r"^" + re.escape(a.get("title") or "") + r"\s*", "", tx.get_text(" ", strip=True)) if tx else ""})
    return out
OK = {"p", "h2", "h3", "h4", "ul", "ol", "li", "blockquote", "strong", "em", "b", "i", "br", "img", "figure", "figcaption"}
def clean(node):
    for t in node.find_all(True):
        if t.name in ("script", "style", "svg", "button", "form", "iframe", "nav", "noscript"): t.decompose(); continue
    out = []
    def walk(n):
        for c in n.children:
            if getattr(c, "name", None) is None:
                out.append(H.escape(str(c)))
            elif c.name == "img":
                s = real_img(c.get("src") or "")
                if s.startswith("http"): out.append(f'<img src="{H.escape(s)}" alt="" loading="lazy">')
            elif c.name in OK:
                tag = {"b": "strong", "i": "em", "h4": "h3"}.get(c.name, c.name)
                out.append(f"<{tag}>"); walk(c); out.append(f"</{tag}>" if tag != "br" else "")
            elif c.name == "a":
                walk(c)
            else:
                walk(c)
    walk(node)
    h = re.sub(r"<p>\s*</p>", "", "".join(out)); return re.sub(r"\s+", " ", h).strip()
def article(slug):
    S = BeautifulSoup(get(f"{BASE}/news/{slug}"), "html.parser")
    meta = lambda p: (S.find("meta", attrs={"property": p}) or S.find("meta", attrs={"name": p}) or {}).get("content", "")
    best, score = None, 0
    for d in S.find_all(["article", "div", "section"]):
        ps = d.find_all("p", recursive=True); txt = sum(len(p.get_text()) for p in ps)
        if txt > score and len(d.find_all(["article", "div", "section"])) < 60: best, score = d, txt
    body = clean(best) if best else ""
    return {"title": meta("og:title"), "img": real_img(meta("og:image")), "desc": meta("og:description"), "html": body[:60000]}
def tidy(h, title):
    """Drop page chrome around the article text (hero/date/title/share at the top, follow-us/author/linked event at the end)."""
    if not h: return h, ""
    i = h.find("Share it")
    if 0 <= i < 1500: h = h[i + len("Share it"):]
    h = re.sub(r"^\s*<p><strong>" + re.escape(H.escape(title)) + r"</strong></p>", "", h.strip())
    au = ""
    m = re.search(r"<h3>Author</h3>((?:<p>[^<]*</p>){1,3})", h)
    if m: au = " ".join(re.findall(r"<p>([^<]*)</p>", m.group(1))).strip()
    for cut in ["<p><strong>How to follow", "<h3>Author</h3>", "<h3>LINKED EVENT</h3>"]:
        j = h.find(cut)
        if j > 0: h = h[:j]
    return re.sub(r"(<p>\s*</p>)+$", "", h.strip()), au
def main():
    path = os.path.join(os.path.dirname(__file__), "..", "news.json")
    old = json.load(open(path)) if os.path.exists(path) else {"items": []}
    have = {x["slug"]: x for x in old.get("items", [])}
    try: L = cards(get(BASE + "/"))[:10]
    except Exception as ex: print("news: home failed", ex); sys.exit(1)
    items = []
    for c in L:
        it = dict(have.get(c["slug"], {})); it.update({k: v for k, v in c.items() if v})
        if not it.get("html"):
            try:
                a = article(c["slug"]); it["html"] = a["html"]; it["img"] = it.get("img") or a["img"]; it["x"] = it.get("x") or a["desc"]
            except Exception as ex: print("article failed", c["slug"], ex)
        if it.get("html"):
            it["html"], au = tidy(it["html"], it.get("t", ""))
            if au: it["au"] = au
        items.append(it)
    new = {"items": items}
    if json.dumps(new, sort_keys=True) != json.dumps(old, sort_keys=True):
        json.dump(new, open(path, "w"), ensure_ascii=False, separators=(",", ":")); print("changed", len(items))
    else: print("same", len(items))
if __name__ == "__main__":
    if len(sys.argv) > 2 and sys.argv[1] == "--home": print(json.dumps(cards(open(sys.argv[2]).read()), ensure_ascii=False, indent=1)[:2500])
    else: main()
