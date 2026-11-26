# SSL Gold Cup Rio 2026 – companion app · handover

Read this first in any new session. Everything needed to keep developing the app lives in this repository.

## What it is
- Unofficial companion PWA for the SSL Gold Cup Final Series, Rio de Janeiro, 19 Nov – 13 Dec 2026 (Marina da Glória).
- Owner: Hansi (filmmaker for Chimbovision at the event; German, works on the Chimbovision MacBook "Jasper" with the RAID at `/Volumes/data/26_GOLD_CUP_RIO`). Talk to him in German, no hype, verify facts.
- Live: https://hansmann-creator.github.io/SSL-Gold-Cup/ · short link https://is.gd/sslgoldcup
- Static site on GitHub Pages, no build step for the UI. 19 languages (en de fr es pt it zh ar hi bn ur id ms ja th hu cs uk pl). `scripts/smoke.py` fails if any language misses a text; `python3 tools/i18n/export.py` (server on :8011) writes `i18n/export/<lang>.csv` for proofreading; fixed sailing terms in `i18n/glossary.json`.

## Files
| File | Purpose |
|---|---|
| `index.html` | Shell: header bar (settings · brightness · language · install pill · countdown), `#main` views, `#pg` pages layer, `#tmd` dialog, tab bar. Link-preview meta tags (image `icons/share-app2.jpg`). |
| `app.js` | Whole app (vanilla JS). All UI strings in `S.<lang>` plus extra dicts merged into `S` (SSET settings, SPF profile, WXF, ALSO, CP, SOW, CHT changelog …). `T(key)` falls back to English. |
| `app.css` | Styles; later rules override earlier ones (append at the end). |
| `results.json` | Results, written ONLY by the update workflows – never push it by hand. |
| `teaminfo.json` | 40 teams: name, nick, captain, helm, rank, route, notes, `crew` = official Rio portraits `{no,name,img}`. |
| `roster.json` | Squads from the official team pages `xxx.sslgoldcup.com`: `{"n":nick,"c":captain,"s":[[name, raw position, number, [positions…]]]}`. Position list: first = Rio jersey (1–9), then other positions from the team page ("also …" in the app). |
| `profiles.json` | Facts + bios from worldofsailors.com profiles, keyed `CODE|Name` (workflow `profiles.yml`). |
| `overrides.json` | Manual corrections for the daily update (`set` position/number, `keep`, `drop`). Never written by bots. |
| `sp/` | One JSON per sailor (worldofsailors.com public profile: results, ranking history, records, achievements, socials); `rank/ind.json` men/women individual rankings (top 500 skipper + crew). No e-mail/phone/birth data. |
| `people.json` | Hand-written highlight bullets for famous sailors. |
| `img/` | Sailor portraits 320×320 webp, `CODE-NO-name-slug.webp`; `img/fl/` flags. |
| `live.json` | Live-stream state (written by `live.yml`). |
| `rank/` | SSL Nations Ranking mirror (`scripts/ranking.py`, workflow `ranking.yml`): `index.json` (weeks, continents) + one file per week. Shown in-app at `#ranking`; never link out to worldofsailors.com. |
| `flags.json` | Manual race notes from Hansi, e.g. `{"races":{"r16|A|1":{"pd":true,"nb":"<UTC ISO>","until":"<UTC ISO>"}}}` → header strip and race list show "Delayed · not before HH:MM" (manual, wins over the estimate). `"days":{"YYYY-MM-DD":{"over":true}}` = no more racing that day: header strip shows 'Racing day over · next race …', unsailed races are hidden and replaced by a summary box. Countdown states otherwise come from the schedule and Georacing's live feed (waiting / racing / done). |
| `timing.json` | Learned race timing (`scripts/timing.py`, live loop every 2 min): Georacing actual start/finish per race key, operator start time (`plan`), median race length `dur` and changeover `gap` (minutes). The app estimates delays of following races from it (“Probably delayed ~HH:MM”); flags.json still wins. |
| `news.json` | Latest news from worldofsailors.com (`scripts/news.py`, workflow `news.yml` every 20 min in Nov/Dec): cards on Home above Explore, full article in an in-app reader (images hot-linked from platform.worldofsailors.com). |
| `reports.json` | Race reports `{raceKey:{html,title,src}}` from the Google Drive folder `02_Race-Reports` (id 14XyNTwjimpGGTBownb5OfLyRfnowU3IF, must be shared 'anyone with the link'); `scripts/reports.py` in the live loop every 5 min maps file names like 'R16 Group A Race 1' / '1-16 A1' to race keys and converts Google Docs/Word/PDF/text. Shown in the Race Report popup on the race page. |
| `sched.json` | Official schedule changes (Race Committee notices): a day listed under `days` replaces the generated schedule for that day (app.js SCH and scripts/build_extras.py). `ap:1` = approximate time (“as soon as practicable after the prior race”) → shown as “~HH:MM · After prior race”, re-estimated live. 26 Nov: only A1/B1 (C1/D1 moved); 27 Nov: C1 11:00, C2, D1, D2, A2, B2. |
| `config.js` | `CFG.push` = OneSignal App ID, `CFG.gc` = GoatCounter code. Empty = feature off. |
| `tools/positions/` | Position audit: `audit.py` (runs in Actions, fetches team pages), `rebuild.py` (merges sources → roster.json + positions_report.json), `xls.json` (production sheet extract). |

## Workflows (.github/workflows)
- `deploy.yml` – on push: build_extras.py (tracking mirror `trk/`), Playwright smoke test (`scripts/smoke.py`, must pass), publish Pages.
- `live.yml` – race days 14–22 UTC, minute loop: results + push (`notify.py`), live stream (`live_video.py`), start reminders and live push (`push_extra.py`), tracking watcher (`trk_watch.py`).
- `ranking.yml` – mirrors the nations ranking twice a day.
- `daily.yml` – every night 03:07 Rio: `scripts/daily.py` rebuilds roster.json from the team pages (plausibility checks, removals only after 2 days missing, `overrides.json` wins), then `scripts/sailors.py all` (profiles.json, `sp/<slug>.json` per sailor, `rank/ind.json` men/women rankings). Anomalies/squad changes → GitHub issue (mail to Hansi). Log in `updates.json`. Bots only write data JSON, never app code.
- `update.yml` – results backup every 10 min. `extras.yml` – highlight-video push every 30 min. `profiles.yml` – manual run only (daily.yml does it every night).

## Conventions
- Commit as `Hansi (via Claude) <hansmann-creator@users.noreply.github.com>`; push with `git pull -q --rebase --depth=20 origin main && git -c push.negotiate=true push -q origin main`.
- Test locally: `python3 -m http.server 8011` + Playwright (Chrome at `/usr/bin/google-chrome`); run `python3 scripts/smoke.py` before pushing.
- The Claude container cannot reach sslgoldcup.com / worldofsailors.com / Georacing / YouTube → fetch those inside a temporary GitHub Actions workflow and push the result to an orphan branch, then remove the workflow.
- Never commit secrets. OneSignal REST key only as repo secret `ONESIGNAL_REST_KEY` (set by Hansi).
- RAID production folders are read-only: never modify or delete there.
- New features → add an entry to the changelog (`CHL`/`CHT` in app.js, bump version `v`).

## Recurring jobs
- **New portraits** (`/Volumes/data/26_GOLD_CUP_RIO/05_Footage_Graphic/SAILOR_PHOTOS/<TEAM>/`): official RAID photos always win and may overwrite older ones. Prefer the clean files in the team folder root (600×600 PNG, transparent) → 320 px webp in `img/` **and** 600 px webp with the same name in `img/hd/` (tap-to-zoom on the sailor page), add/update `teaminfo.json` crew `{no,name,img}`.
- **Positions**: run audit in Actions → `python tools/positions/rebuild.py audit.json tools/positions/xls.json` → review `positions_report.json` (conflicts, added/removed sailors).
- **New UI text**: add it to every language (the smoke test checks this) – follow `i18n/glossary.json`.
- **New language**: add to `LANGS`, `LOC`, lang auto-detect list, `ORD`, `OSL`, `<select id="lang">`, a full `S.<lang>` block (copy the `cs` block), SSET, SOW, CP, WXF, ALSO, FIX; plus `scripts/notify.py` (LANGS, RN, W, spoiler text) and `scripts/push_extra.py`; add to `scripts/smoke.py`.

## Open items (waiting for Hansi)
- OneSignal App ID (+ secret `ONESIGNAL_REST_KEY`) → push notifications go live.
- Feedback: Google Form link (prefilled link with entry IDs) from Hansi → in-app "Wunsch melden".

## Done
- GoatCounter live: `CFG.gc="ssl-gold-cup"` → https://ssl-gold-cup.goatcounter.com (events: start-app/start-browser, install = first launch from home screen per device – also counts iPhones, install-tap, install-guide-*, install-confirmed (Android only), lang-*, lang-auto-*/lang-manual-*). Open the app once with `?gcskip=1` on a device to exclude it from the stats (`?gcskip=0` undoes it).
- Races show the actual start from Georacing (`timing.json` `s`/`plan`): “started 12:25”, planned time struck through.
