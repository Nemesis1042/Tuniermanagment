# Turnierverwaltung

Software für Turniere auf Freizeiten/Lagern — Anmeldung, Spielplan, Ergebnisse,
Tabelle, Aushang. Siehe [Pflichtenheft](files/pflichtenheft-turniersoftware.md)
für die vollständige Spezifikation.

## Stand

Stufe 1 (reiner Papierweg, dieses Jahr) ist im Kern fertig:

- **Datenmodell & Slot-Auflösung** (Kap. 5) — `packages/shared/src/resolution.ts`
- **Liga & Single Elimination inkl. Freilose** (Kap. 6.1, 3.1, 3.3) — `packages/shared/src/bracket.ts`
- **Tabelle & Tiebreaker-Kette** (3.7, 6.3) — `packages/shared/src/table.ts`
- **Rückzug / kampflose Wertung** (F-18) — `packages/shared/src/withdrawal.ts`
- **REST-API**: Turnier/Team-Verwaltung, Spielplan-Erzeugung, Ergebnisfluss mit
  Korrektur-Kaskade und Protokoll — `packages/server/`
- **Web-UI (Admin/MA)**: Turnierliste/-anlage, Teams, Spielplan, Nacherfassung
  (F-38, Tastatur-only), Tabelle — `packages/web/`
- **Druckvorlagen A4** (F-26 bis F-29, F-39 Sammeldruck) — `packages/server/src/print/`,
  angebunden an die Entwürfe in `files/aushang-*.html`

Offen aus der Umsetzungsreihenfolge (Kap. 11):

- Grafische Baumansicht *am Bildschirm* (aktuell nur als Ausdruck; Web-UI zeigt
  K.-o.-Turniere noch als Runden-Liste statt als Baum)
- Gruppenphase + K.-o. (3.4)
- Export & Backup (F-70 bis F-72)
- Automatisierte Server-/API-Tests (bisher nur Shared-Smoke-Tests und manuelle
  Browser-Tests)
- Stufe 2 (Tablet-Terminal, Anzeige-Bildschirm, Pi-Server, Offline-Sync) —
  noch nicht begonnen

## Projektstruktur

```
packages/
  shared/   Datenmodell, Kernalgorithmen (Bracket, Tabelle, Slot-Auflösung) — reines TypeScript, keine DB
  server/   Express + SQLite (better-sqlite3), REST-API, PDF-Druckvorlagen
  web/      React/Vite, Admin- und MA-Oberfläche
files/
  pflichtenheft-turniersoftware.md   Spezifikation
  aushang-*.html                     Handentwürfe für die A4-Ausdrucke (Vorlage für packages/server/src/print/)
```

## Entwicklung

```bash
npm install

# Terminal 1: API-Server (Port 3001, SQLite-Datei unter packages/server/data/)
npm run dev:server

# Terminal 2: Web-UI (Port 5173, proxyt /api auf Port 3001)
npm run dev:web
```

Für die PDF-Druckvorlagen wird ein lokal installiertes Chrome/Chromium
vorausgesetzt (`google-chrome-stable`, `google-chrome` oder `chromium`, sonst
über die Umgebungsvariable `CHROME_PATH` angeben).

### Tests

```bash
cd packages/shared && npm run build && npm test
```

Deckt die Abnahmekriterien T-1, T-2, T-4, T-9, T-10, T-11 aus Kapitel 10 des
Pflichtenhefts ab.
