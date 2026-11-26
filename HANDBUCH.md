# SSL Gold Cup App – Handbuch für Hansi (ohne KI)

Alles, was die App braucht, liegt in diesem GitHub-Repository: **github.com/Hansmann-Creator/SSL-Gold-Cup**.
Die App läuft unter https://hansmann-creator.github.io/SSL-Gold-Cup/ (Kurzlink https://is.gd/sslgoldcup).
Ergebnisse, Livestream, Tracking, Ranking und Zeitschätzungen aktualisieren sich **automatisch** über GitHub Actions – ganz ohne Claude.

## Wenn Claude nicht mehr verfügbar ist
- **Neue KI-Sitzung** (Claude Code, ein anderer Claude-Account, ChatGPT/Codex, Cursor, Copilot …): Repository öffnen und sagen
  „Lies CLAUDE.md und arbeite an der App weiter“. Dort steht die komplette technische Übergabe.
- **Kleine Änderungen selbst**: Datei auf GitHub öffnen → Stift-Symbol → ändern → „Commit changes“. Nach ca. 3 Minuten ist die App aktualisiert.

## Häufige Handgriffe
### Startverschiebung eintragen
Datei `flags.json` bearbeiten: https://github.com/Hansmann-Creator/SSL-Gold-Cup/edit/main/flags.json
```json
{"races":{"r16|C|1":{"pd":true,"nb":"2026-11-26T18:45:00Z","until":"2026-11-26T21:00:00Z"}}}
```
- Schlüssel: `Runde|Gruppe|Rennen` – Runden: `r32 r16 r8 r4 sf pf f`, Gruppen `A–D` (Halbfinale `A/B`, Finale `A`).
- `nb` = „nicht vor“ in **UTC** (Rio-Zeit + 3 Stunden, also 15:45 Rio = `18:45:00Z`).
- `until` = bis wann der Hinweis gilt. Leeren: `{"races":{}}`.

### Renntag vorzeitig beendet
In `flags.json` unter `days` eintragen: `{"races":{},"days":{"2026-11-26":{"over":true}}}` → oben „Renntag beendet · Nächstes Rennen …“, in der Liste verschwinden die nicht gesegelten Rennen, stattdessen „Renntag beendet · 2 Rennen gesegelt · Gruppe C & D verschoben“.

### Neuer Zeitplan (Race Committee)
Datei `sched.json`: unter `days` einen Tag eintragen – er ersetzt den Standardplan dieses Tages. Beispiel: `{"rid":"r16","g":"C","n":2,"t":"12:20","ap":1}` (`ap:1` = ungefähre Zeit, „nach Rennen davor“).

### Live-Schleife neu starten (wenn Ergebnisse hängen)
Datei `.github/live_kick` bearbeiten, irgendetwas hineinschreiben, speichern. Oder: Actions → „Live results“ → „Run workflow“.

### Feedback-Adresse / Zähler
`config.js`: `fb` = Ziel für „Wunsch oder Fehler melden“ (FormSubmit), `gc` = GoatCounter-Code (`ssl-gold-cup`, Zahlen unter https://ssl-gold-cup.goatcounter.com).

### Was nie von Hand geändert wird
`results.json`, `live.json`, `timing.json`, `rank/` – die schreiben die Automatiken.

## Absicherung
- GitHub-Zugang sichern: Zwei-Faktor aktiv, **Recovery-Codes** ausgedruckt/offline aufbewahrt.
- Backup: auf GitHub „Code → Download ZIP“ oder per `git clone`. Die App ist eine statische Website; jede Kopie lässt sich wieder auf GitHub Pages (oder jedem Webspace) veröffentlichen.
