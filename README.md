# Budgetblick

Ausgaben-Manager für Privatpersonen in der Schweiz. Beantwortet die Frage:
**„Wie viel Geld habe ich diesen Monat wirklich zur freien Verfügung?"**

- Fixkosten und Einkommen als Fundament, alles auf Monatsbeträge umgerechnet
- Verträge mit Kündigungsfristen und rechtzeitigen Warnungen
- Schnelle Erfassung variabler Ausgaben, auch per Quittungsfoto

Alle Daten bleiben lokal im Browser (IndexedDB). Kein Backend, kein Login, kein Tracking.

## Voraussetzungen

- Node.js 20 oder neuer (entwickelt mit Node 24)

## Befehle

```bash
npm install        # Abhängigkeiten installieren
npm run dev        # Entwicklungsserver starten (http://localhost:5173)
npm test           # Tests einmalig ausführen
npm run test:watch # Tests im Watch-Modus
npm run lint       # ESLint
npm run format     # Prettier
npm run build      # Typprüfung und Produktions-Build nach dist/
npm run preview    # Produktions-Build lokal ausliefern
```

## Texterkennung (Quittungsscan)

Die Quittungserkennung nutzt Tesseract.js mit deutschem Sprachpaket und läuft vollständig im
Browser. Worker, WASM-Core und Sprachdaten werden **nicht** von einem CDN geladen, sondern von der
eigenen Domain ausgeliefert. `npm run dev` und `npm run build` kopieren sie automatisch aus
`node_modules` nach `public/tesseract/` (gitignored, ca. 13 MB; der Browser lädt davon ca. 5 MB
beim ersten Scan). Manuell: `npm run copy:tesseract`.

## Projektstruktur

```
src/
  lib/         Reine Geschäftslogik (Beträge, Datum, Berechnungen) inkl. Tests
  db/          Dexie-Datenbank, Schema und Standardkategorien
  components/  Wiederverwendbare UI-Komponenten
  pages/       Bildschirme
  types.ts     Datenmodell
```

## Konventionen

- Beträge werden intern in **Rappen** (Integer) gespeichert, angezeigt als `CHF 1'234.50`.
- Datumsfelder werden als ISO-Datum (`YYYY-MM-DD`) gespeichert, angezeigt als `TT.MM.JJJJ`.
- Geschäftslogik liegt ausschliesslich in `src/lib/` und ist unabhängig von React testbar.

## Stack

React, TypeScript (strict), Vite, Tailwind CSS, Dexie.js, date-fns, Vitest und React Testing Library.
