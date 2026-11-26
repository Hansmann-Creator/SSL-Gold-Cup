#!/usr/bin/env python3
"""Fetch the official SSL Gold Cup results page and update results.json.

Only the Finals Series tables are read. The file keeps the app's structure:
{updatedAt, checkedAt, source, rounds:[{id,name,short,start,end,groups:[{id,note?,rows:[{team,r:[..],total}]}]}]}
Nothing is written if the page cannot be parsed into the expected 7 rounds x 4-row groups.
"""
import json, re, sys, datetime, os, urllib.request
from bs4 import BeautifulSoup

URL = "https://sslgoldcup.worldofsailors.com/results/"
FILE = os.path.join(os.path.dirname(__file__), "..", "results.json")
STAGES = {"1/32 FINALS": "r32", "1/16 FINALS": "r16", "1/8 FINALS": "r8", "1/4 FINALS": "r4",
          "1/2 FINALS": "sf", "PETIT FINAL": "pf", "FINAL": "f"}
LABEL = re.compile(r"(1/32 FINALS|1/16 FINALS|1/8 FINALS|1/4 FINALS|1/2 FINALS|PETIT FINAL|FINAL)\s*-\s*Group\s+([A-J])\b", re.I)
NOTE_WORDS = {"OCS": "OCS (early start)", "DPI": "DPI (discretionary penalty)", "DSQ": "DSQ (disqualified)",
              "DNF": "DNF (did not finish)", "DNS": "DNS (did not start)", "RDG": "RDG (redress)",
              "STANDARD PENALTY": "Standard penalty"}


def now():
    return datetime.datetime.now(datetime.timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")


def fetch(url):
    req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0 (GoldCupMatchboard results bot)"})
    with urllib.request.urlopen(req, timeout=40) as r:
        return r.read().decode("utf-8", "replace")


def clean(t):
    return re.sub(r"\s+", " ", t or "").strip()


def note_text(raw):
    parts = re.findall(r"(\*+)\s*([A-Za-z][A-Za-z ]*?)(?=\s*\*|$)", raw.strip())
    out = []
    for stars, word in parts:
        w = NOTE_WORDS.get(word.strip().upper(), word.strip())
        out.append(f"{stars} {w}")
    return "  ".join(out)


def label_for(table):
    """Nearest preceding text that looks like 'STAGE - Group X'."""
    for el in table.find_all_previous(string=True, limit=60):
        m = LABEL.search(clean(el))
        if m:
            return STAGES[m.group(1).upper()], m.group(2).upper()
    return None


def note_after(table):
    n = 0
    for el in table.find_all_next(string=True, limit=400):
        if table in el.parents:
            continue
        n += 1
        if n > 8:
            break
        t = clean(el)
        if not t:
            continue
        if LABEL.search(t) or t.lower().startswith("position"):
            return ""
        if t.startswith("*"):
            return note_text(t)
    return ""


def team_code(cell):
    txt = clean(cell.get_text(" "))
    m = re.findall(r"\b([A-Z]{3}|[A-Z0-9]{3,5}[0-9])\b", txt)
    if m:
        return m[-1]
    img = cell.find("img")
    if img and img.get("alt"):
        return clean(img["alt"]).upper()
    return txt


def parse(html):
    soup = BeautifulSoup(html, "html.parser")
    found = {}
    for table in soup.find_all("table"):
        heads = [clean(th.get_text(" ")) for th in table.find_all("th")]
        if not heads or "Team" not in heads:
            continue
        lab = label_for(table)
        if not lab:
            continue
        rid, gid = lab
        rcols = [i for i, h in enumerate(heads) if re.fullmatch(r"R\d+", h)]
        tcol = heads.index("Team")
        totcol = next((i for i, h in enumerate(heads) if "Total" in h or h == "Pts"), len(heads) - 1)
        rows = []
        for tr in table.find_all("tr"):
            tds = tr.find_all("td")
            if len(tds) < len(heads):
                continue
            rows.append({"team": team_code(tds[tcol]),
                         "r": [clean(tds[i].get_text(" ")) for i in rcols],
                         "total": clean(tds[totcol].get_text(" "))})
        g = {"id": gid, "rows": rows}
        n = note_after(table)
        if n:
            g["note"] = n
        found.setdefault(rid, {})[gid] = g
    return found


QLABEL = re.compile(r"(ASIAN QUALIFIERS|AFRICAN OCEANIAN QUALIFIERS|EUROPEAN QUALIFIERS 1|EUROPEAN QUALIFIERS 2|PAN-AMERICAN QUALIFIERS)\s*-\s*Group\s+([A-J])\b(?:\s*\(([^)]*)\))?(?:\s*-\s*(.+))?", re.I)
QIDS = {"ASIAN QUALIFIERS": "asia", "AFRICAN OCEANIAN QUALIFIERS": "afoc", "EUROPEAN QUALIFIERS 1": "eu1", "EUROPEAN QUALIFIERS 2": "eu2", "PAN-AMERICAN QUALIFIERS": "pan"}


def extras(html):
    """Overall standings (Position/Team) and the qualifier group tables – shown in the app's results page.
    Best effort: any problem here returns None and never touches the Finals Series data."""
    try:
        soup = BeautifulSoup(html, "html.parser")
        overall, quals = [], []
        for table in soup.find_all("table"):
            heads = [clean(th.get_text(" ")) for th in table.find_all("th")]
            if not heads or "Team" not in heads:
                continue
            tcol = heads.index("Team")
            rcols = [i for i, h in enumerate(heads) if re.fullmatch(r"R\d+", h)]
            if not rcols and not overall:
                pcol = next((i for i, h in enumerate(heads) if h.lower().startswith("pos")), 0)
                for tr in table.find_all("tr"):
                    tds = tr.find_all("td")
                    if len(tds) >= len(heads):
                        code = team_code(tds[tcol])
                        overall.append([clean(tds[pcol].get_text(" ")), code if re.fullmatch(r"[A-Z]{3}", code or "") else ""])
                continue
            lab = None
            for el in table.find_all_previous(string=True, limit=60):
                t = clean(el)
                if LABEL.search(t):
                    break
                m = QLABEL.search(t)
                if m:
                    lab = m; break
            if not lab:
                continue
            totcol = next((i for i, h in enumerate(heads) if "Total" in h or h == "Pts"), len(heads) - 1)
            rows = []
            for tr in table.find_all("tr"):
                tds = tr.find_all("td")
                if len(tds) < len(heads):
                    continue
                rows.append({"team": team_code(tds[tcol]), "r": [clean(tds[i].get_text(" ")) for i in rcols], "total": clean(tds[totcol].get_text(" "))})
            q = {"ev": QIDS[lab.group(1).upper()], "id": lab.group(2).upper(), "dates": clean(lab.group(4) or ""), "extra": clean(lab.group(3) or ""), "rows": rows}
            n = note_after(table)
            if n:
                q["note"] = n
            if not any(x["ev"] == q["ev"] and x["id"] == q["id"] for x in quals):
                quals.append(q)
        return {"overall": overall, "quals": quals} if (overall or quals) else None
    except Exception as ex:
        print("extras skipped:", ex)
        return None


def merge(old, found):
    new = json.loads(json.dumps(old))
    for r in new["rounds"]:
        groups = found.get(r["id"])
        if not groups:
            raise SystemExit(f"round {r['id']} not found on page")
        out = []
        for g in r["groups"]:
            ng = groups.get(g["id"])
            if not ng or len(ng["rows"]) != len(g["rows"]) or any(len(x["r"]) != len(g["rows"][0]["r"]) for x in ng["rows"]):
                raise SystemExit(f"group {r['id']} {g['id']} missing or malformed: {ng}")
            out.append(ng)
        r["groups"] = out
    return new


def main():
    """--stamp: also save checkedAt when nothing changed (so the app can show 'checked x min ago')."""
    stamp = "--stamp" in sys.argv
    old = json.load(open(FILE, encoding="utf-8"))
    html = fetch(URL)
    found = parse(html)
    new = merge(old, found)
    ex = extras(html)
    if ex:
        new.update(ex)
    keys = ("rounds", "overall", "quals")
    changed = any(json.dumps(new.get(k), sort_keys=True) != json.dumps(old.get(k), sort_keys=True) for k in keys)
    t = now()
    if changed or stamp:
        new["checkedAt"] = t
        new["source"] = URL
        if changed:
            new["updatedAt"] = t
        json.dump(new, open(FILE, "w", encoding="utf-8"), ensure_ascii=False, separators=(",", ":"))
    print(t, "CHANGED" if changed else "no change", "(stamped)" if stamp and not changed else "")


if __name__ == "__main__":
    if "--probe" in sys.argv:
        h = fetch(URL); print(json.dumps(extras(h), ensure_ascii=False, indent=1)[:6000]); sys.exit(0)
    main()
