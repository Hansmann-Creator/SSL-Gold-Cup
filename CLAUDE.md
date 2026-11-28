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
| `overrides.json` | Manual corrections for the daily update (`set` position/number, `keep`, `drop`). `spfix` = per-sailor fixes for worldofsailors errors (namesakes, wrong medals: `drop`/`noach`/`rank` by [year, class]); `gc_champion` = team code of the 2026 winner, to be set by hand after the Grand Final (until then all 'SSL Gold Cup Winner 2026' badges from worldofsailors are shown as 'Qualified for the Final Series', and interim 'SSL Gold Cup 2026' ranks are hidden). Never written by bots. |
| `sp/` | One JSON per sailor (worldofsailors.com public profile: results, ranking history, records, achievements, socials); `rank/ind.json` men/women individual rankings (top 500 skipper + crew). No e-mail/phone/birth data. |
| `pron.json` | Name pronunciation per sailor (`ph` phonetic, `audio` → `audio/names/…`, `ok` verified). Shown on the sailor page. |
| `people.json` | Hand-written highlight bullets for famous sailors. |
| `pf.json` + `img/pf/`, `img/hd/pf/` | Mirrored official SSL portraits for sailors without a Rio RAID portrait: `"CODE|Name": "CODE-name-slug"` → 320 px / 600 px webp. Sources: SSL platform profile photos (platform.worldofsailors.com) and athlete pages of the official team sites (xxx.sslgoldcup.com/athlete/…). RAID portraits always win (squad() uses pf only when no crew img). Rebuild via `tools/photos/` (probe.py → dl.py, run in Actions). |
| `tp.json` | Facts from the athlete pages of the official team sites: `"CODE|Name": {cm,kg,bio,res:[[rank,event,city,class,year]],url}`; ages stripped. Shown on sailor pages only where the SSL profile is thin or missing (Overview "Best results", facts, Bio, link "Team page"). |
| `img/` | Sailor portraits 320×320 webp, `CODE-NO-name-slug.webp`; `img/fl/` flags. |
| `live.json` | Live-stream state (written by `live.yml`). |
| `rank/` | SSL Nations Ranking mirror (`scripts/ranking.py`, workflow `ranking.yml`): `index.json` (weeks, continents) + one file per week. Shown in-app at `#ranking`; never link out to worldofsailors.com. |
| `flags.json` | Manual race notes from Hansi, e.g. `{"races":{"r16|A|1":{"pd":true,"nb":"<UTC ISO>","until":"<UTC ISO>"}}}` → header strip and race list show "Delayed · not before HH:MM" (manual, wins over the estimate). `"days":{"YYYY-MM-DD":{"over":true}}` = no more racing that day: header strip shows 'Racing day over · next race …', unsailed races are hidden and replaced by a summary box. Countdown states otherwise come from the schedule and Georacing's live feed (waiting / racing / done). |
| `timing.json` | Learned race timing (`scripts/timing.py`, live loop every 2 min): Georacing actual start/finish per race key, operator start time (`plan`), median race length `dur` and changeover `gap` (minutes). The app estimates delays of following races from it (“Probably delayed ~HH:MM”); flags.json still wins. |
| `news.json` | Latest news from worldofsailors.com (`scripts/news.py`, workflow `news.yml` every 20 min in Nov/Dec): cards on Home above Explore, full article in an in-app reader (images hot-linked from platform.worldofsailors.com). |
| `reports.json` | Race reports `{raceKey:{html,title,src}}` from the Google Drive folder `02_Race-Reports` (id 14XyNTwjimpGGTBownb5OfLyRfnowU3IF, must be shared 'anyone with the link'); `scripts/reports.py` in the live loop every 5 min maps file names like 'R16 Group A Race 1' / '1-16 A1' to race keys and converts Google Docs/Word/PDF/text. Shown in the Race Report popup on the race page. |
| `tk/` | Race ticker data, one file per race `tk/<round>_<group>_<race>.json` (`scripts/ticker.py`, live loop every 2 min): Georacing mark roundings per boat (`m`), wind `w`, race stats `st` per team [time in lead %, manoeuvres, top speed kn, distance nm]. Never replaced by a file with fewer roundings (Georacing sometimes clears finished races). The app writes the ticker text from it in every language (`TKR`, `tkHtml`) on the race page, compares the tracking finish with the official result and is hidden in spoiler mode. Backfill: `python3 scripts/ticker.py all` (in Actions). |
| `crs/` | Course picture data per race `crs/<round>_<group>_<race>.json` (`scripts/course.py`, live loop every 5 min, `course.yml` rebuilds all): median mark positions during the race (`mk`), each boat's track thinned to 4 s (`tr`), own top speed per boat (`ts`, best ≥10 s average, GPS jumps removed). Drawn at the bottom of “Race in numbers” (`rnxCourse`, rotated so the wind blows from the top, north arrow). |
| `sched.json` | Official schedule changes (Race Committee notices): a day listed under `days` replaces the generated schedule for that day (app.js SCH and scripts/build_extras.py). `ap:1` = approximate time (“as soon as practicable after the prior race”) → shown as “~HH:MM · After prior race”, re-estimated live. 26 Nov: only A1/B1 (C1/D1 moved); 27 Nov: C1 11:00, C2, D1, D2, A2, B2; 28 Nov: briefing 10:00, C3 12:00, D3, A3, B3. |
| `config.js` | `CFG.push` = OneSignal App ID, `CFG.gc` = GoatCounter code. Empty = feature off. |
| `tools/positions/` | Position audit: `audit.py` (runs in Actions, fetches team pages), `rebuild.py` (merges sources → roster.json + positions_report.json), `xls.json` (production sheet extract). |

## Workflows (.github/workflows)
- `deploy.yml` – on push: build_extras.py (tracking mirror `trk/`), Playwright smoke test (`scripts/smoke.py`, must pass), publish Pages.
- `live.yml` – race days, window from `scripts/plan.py` (60 min before the first race until 2 h after the last can finish; results polled from first start + race length − 15 min; attempts every 20 min, runs queue, 6-h handover), job `results` (own runner, so slow live-loop steps never delay it): every minute in the results phase, every 10 s while `hot.py` says a race is finishing/finished without official result, + push (`notify.py`); job `live` minute loop: live stream (`live_video.py`), start reminders and live push (`push_extra.py`), tracking watcher (`trk_watch.py`), race ticker (`ticker.py` → `tk/`), course data (`course.py` → `crs/`).
- `ranking.yml` – mirrors the nations ranking twice a day.
- `daily.yml` – every night 03:07 Rio: `scripts/daily.py` rebuilds roster.json from the team pages (plausibility checks, removals only after 2 days missing, `overrides.json` wins), then `scripts/sailors.py all` (profiles.json, `sp/<slug>.json` per sailor, `rank/ind.json` men/women rankings). Anomalies/squad changes → GitHub issue (mail to Hansi). Log in `updates.json`. Bots only write data JSON, never app code.
- `update.yml` – results backup every 10 min (only in the plan.py results phase, when live.yml isn't running). Schedule logic exists 3× (app.js SCH, build_extras.py, plan.py) – keep in sync. `extras.yml` – highlight-video push every 30 min. `profiles.yml` – manual run only (daily.yml does it every night).

## Conventions
- Commit as `Hansi (via Claude) <hansmann-creator@users.noreply.github.com>`; push with `git pull -q --rebase --depth=20 origin main && git -c push.negotiate=true push -q origin main`.
- Start-time estimates: after a race day run `python3 scripts/replay_estimates.py YYYY-MM-DD` (server on :8011) – shows what the app displayed 20/10/5 min before each real start.
- Test locally: `python3 -m http.server 8011` + Playwright (Chrome at `/usr/bin/google-chrome`); run `python3 scripts/smoke.py` before pushing.
- The Claude container cannot reach sslgoldcup.com / worldofsailors.com / Georacing / YouTube → fetch those inside a temporary GitHub Actions workflow and push the result to an orphan branch, then remove the workflow.
- Never commit secrets. OneSignal REST key only as repo secret `ONESIGNAL_REST_KEY` (set by Hansi).
- RAID production folders are read-only: never modify or delete there.
- New features → add an entry to the changelog (`CHL`/`CHT` in app.js, bump version `v`).
- Loading states: use `LDR(text)` (compass loader), never a bare "Loading …" text. Page headers: every #pg page has kicker + title in `.th`.

## Recurring jobs
- **New portraits** (`/Volumes/data/26_GOLD_CUP_RIO/05_Footage_Graphic/SAILOR_PHOTOS/<TEAM>/`): official RAID photos always win and may overwrite older ones. Prefer the clean files in the team folder root (600×600 PNG, transparent) → 320 px webp in `img/` **and** 600 px webp with the same name in `img/hd/` (tap-to-zoom on the sailor page), add/update `teaminfo.json` crew `{no,name,img}`.
- **Photo/facts refresh**: `tools/photos/probe.py` (Actions, writes an orphan branch) mirrors platform portraits, fetches all team-site athlete pages; match locally (typo-tolerant, same team), then `dl.py` for new photos; update `pf.json`/`tp.json`. 174 sailors still without any photo (28 Nov) – RAID portraits needed.
- **Positions**: run audit in Actions → `python tools/positions/rebuild.py audit.json tools/positions/xls.json` → review `positions_report.json` (conflicts, added/removed sailors).
- **New UI text**: add it to every language (the smoke test checks this) – follow `i18n/glossary.json`.
- **New language**: add to `LANGS`, `LOC`, lang auto-detect list, `ORD`, `OSL`, `<select id="lang">`, a full `S.<lang>` block (copy the `cs` block), SSET, SOW, CP, WXF, ALSO, FIX; plus `scripts/notify.py` (LANGS, RN, W, spoiler text) and `scripts/push_extra.py`; add to `scripts/smoke.py`.

## Open items
- Race in numbers LIVE (`rxlFeed`/`rxlHtml`/`rxlMap`, strings `RXLS`, slot `#rxl` on the race page while `st=="now"`): fed by the live leaderboard loop (`lbRun`, Georacing live.json every 3 s: `s`/`vmg` m/s, `gap_t` s, `r`, `cl`, `lt`/`lg`), plus `crs/` (marks, earlier tracks) and `tk/` (wind, mark roundings). Tiles, speed/VMG/top table, live map (bold = last 60 s), gap bars with 2-min trend, moments (lead change, closing in ≥3 s, losing ≥5 s, duel ≤10 s, new race top speed). Tested only with a simulated feed (28 Nov) – check against the first real race; no finish prediction yet (needs remaining distance).
- Race in numbers (`rnxHtml` in app.js, data `tk/` + `crs/`): tiles, one table (lead %, avg speed, top speed, manoeuvres), place/gap chart, team cards, course picture. Top speed = own value from `crs/` (falls back to Georacing `max_speed` only when plausible). Next, only once verified on several races against replay/video, remind Hansi and add: tacks vs gybes separately, VMG upwind/downwind, speed upwind/downwind, start (seconds after the signal – the 27 Nov C1 'JPN ±0 s' looks like an artefact), time-in-lead computed ourselves (Georacing's % starts later than the start), side of the course / tack share, manoeuvre speed loss.

## Open items (waiting for Hansi)
- OneSignal App ID (+ secret `ONESIGNAL_REST_KEY`) → push notifications go live.
- Feedback: Google Form link (prefilled link with entry IDs) from Hansi → in-app "Wunsch melden".

## Done
- GoatCounter live: `CFG.gc="ssl-gold-cup"` → https://ssl-gold-cup.goatcounter.com (events: start-app/start-browser, install = first launch from home screen per device – also counts iPhones, install-tap, install-guide-*, install-confirmed (Android only), lang-*, lang-auto-*/lang-manual-*). Open the app once with `?gcskip=1` on a device to exclude it from the stats (`?gcskip=0` undoes it).
- Sailors tab (variant A): segment Rio 2026 / Men / Women (`rank/ind.json`), sailor page tabs Overview / Results / Ranking (history chart) / Bio from `sp/<slug>.json`; ranked sailors outside Rio open `#sailorx-<slug>` (top 100 of each list have an sp file).
- Races show the actual start from Georacing (`timing.json` `s`/`plan`): “started 12:25”, planned time struck through.
