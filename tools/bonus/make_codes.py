"""QR bonus codes for the live broadcast (prepared – only use with the OK of SSL / the broadcast direction).

Generates random codes for time windows, writes ONLY their hashes to bonus.json (the app checks a scanned code
against these hashes) and a sheet for the broadcast direction with the QR codes and their times.
The sheet contains the plain codes: keep it out of the repo (default output goes to /tmp).

Usage:
  python tools/bonus/make_codes.py --day 2026-12-12 --start 14:00 --end 21:00 --every 20 [--badge final] [--sheet /tmp/regie_2026-12-12.html]
  times are Rio time (UTC-3); every = minutes per code; --badge optional (final = "finals day" badge)
QR images need:  pip install segno
Codes are not linked to any betting game.
"""
import argparse, datetime as dt, hashlib, json, os, secrets

ROOT = os.path.join(os.path.dirname(__file__), "..", "..")
APP = "https://hansmann-creator.github.io/SSL-Gold-Cup/"
ALPH = "23456789ABCDEFGHJKMNPQRSTUVWXYZ"   # no 0/O/1/I/L


def h(code):  # must match bnHash() in app.js
    return hashlib.sha256((code.strip().upper() + "|ssl-gc-rio").encode()).hexdigest()[:20]


def main():
    a = argparse.ArgumentParser()
    a.add_argument("--day", required=True); a.add_argument("--start", default="14:00"); a.add_argument("--end", default="21:00")
    a.add_argument("--every", type=int, default=20); a.add_argument("--badge", default=None); a.add_argument("--sheet", default=None)
    o = a.parse_args()
    rio = dt.timezone(dt.timedelta(hours=-3))
    t = dt.datetime.fromisoformat(f"{o.day}T{o.start}").replace(tzinfo=rio)
    end = dt.datetime.fromisoformat(f"{o.day}T{o.end}").replace(tzinfo=rio)
    p = os.path.join(ROOT, "bonus.json")
    J = json.load(open(p, encoding="utf-8")) if os.path.exists(p) else {"v": 1, "codes": []}
    rows = []
    while t < end:
        u = t + dt.timedelta(minutes=o.every)
        code = "".join(secrets.choice(ALPH) for _ in range(7))
        e = {"h": h(code), "f": t.astimezone(dt.timezone.utc).isoformat().replace("+00:00", "Z"),
             "u": u.astimezone(dt.timezone.utc).isoformat().replace("+00:00", "Z")}
        if o.badge: e["b"] = o.badge
        J["codes"].append(e); rows.append((t, u, code)); t = u
    json.dump(J, open(p, "w", encoding="utf-8"), indent=0)
    sheet = o.sheet or f"/tmp/regie_{o.day}.html"
    try:
        import segno
        qr = lambda c: segno.make(APP + "?bonus=" + c, error="m").svg_inline(scale=8, border=2)
    except ImportError:
        qr = lambda c: "<p>(pip install segno for QR images)</p>"
    html = ["<!doctype html><meta charset=utf-8><title>QR bonus " + o.day + "</title>",
            "<style>body{font:16px system-ui;margin:24px}section{page-break-inside:avoid;display:flex;gap:24px;align-items:center;border-bottom:1px solid #ccc;padding:16px 0}b{font-size:28px;letter-spacing:.1em}</style>",
            f"<h1>QR bonus · {o.day} (Rio time)</h1><p>Show each code only inside its window. Plain codes – do not publish this sheet.</p>"]
    for f, u, c in rows:
        html.append(f"<section>{qr(c)}<div><p>{f:%H:%M} – {u:%H:%M}</p><b>{c}</b><p>{APP}?bonus={c}</p></div></section>")
    open(sheet, "w", encoding="utf-8").write("\n".join(html))
    print(f"{len(rows)} codes -> bonus.json (hashes only); sheet: {sheet}")


if __name__ == "__main__":
    main()
