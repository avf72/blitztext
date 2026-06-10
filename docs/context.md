# Architektur & Betrieb — Kontext

Aktueller Stand und die wichtigsten Entscheidungen/Erkenntnisse zum Projekt.
Letzte Aktualisierung: 2026-06-10.

## Plattformen

Blitztext gibt es als vier Clients in diesem Monorepo:

| Ordner | Plattform | Technik | OpenAI-Zugriff |
|---|---|---|---|
| `windows-app/` | Windows | Electron + TypeScript | direkt (eigener Key, lokal) |
| `BlitztextMac/` | macOS | Swift | direkt (eigener Key, lokal) |
| `android-app/` | Android | Kotlin | über Backend `web-app` |
| `web-app/` | Web (PWA) | Next.js 15 | eigenes Backend |

**Wichtig:** `web-app/` ist zugleich **App und Backend**. Die Route
`web-app/app/api/dictate/route.ts` ist das gemeinsame Backend für **Web und Android**
(server-seitiger OpenAI-Key + Tageslimit pro Nutzer). Windows/macOS rufen OpenAI direkt auf.
Logik (Prompts, Quality, Workflows) ist über die Plattformen portiert — Änderungen an Modell
oder Prompt müssen entsprechend an mehreren Stellen nachgezogen werden.

## Deployment

- **Web → Vercel** (Projekt `blitztext-web`). Auto-Deploy bei Push auf `main`.
  - **KRITISCH (Monorepo):** In den Vercel-Projekteinstellungen muss
    **Root Directory = `web-app`** gesetzt sein (Settings → Build and Deployment).
    Sonst baut Vercel im Repo-Root und jeder GitHub-Deploy scheitert mit
    *"Couldn't find any pages or app directory"*.
  - Live: https://blitztext-web.vercel.app
- **Android → GitHub Actions** (`.github/workflows/android.yml`) → Release-Tag `latest`
  (`app-release.apk`, `app-debug.apk` als Kompat-Kopie, `version.txt`).
- **Windows → GitHub Actions** (`.github/workflows/windows.yml`) → Release-Tag `windows-latest`
  (`Blitztext-Setup.exe`, `windows-version.txt`).
- **Git-Remote:** `avf` = `github.com/avf72/blitztext` ist massgeblich (`main` trackt dort).
  Das alte `origin` (`cmagnussen/blitztext-app`) ist fremd und wird nicht genutzt.

## Versionsschemata

- **Android + Windows: automatisch `0.1.{github.run_number}`.** Jeder CI-Build erhöht die
  Nummer. Die In-App-Updater vergleichen die Build-Nummer (drittes Segment) gegen
  `version.txt` / `windows-version.txt` im jeweiligen Release.
  → **`package.json` (Windows) NICHT manuell auf andere Schemata bumpen** — die CI
  überschreibt die Version per `--config.extraMetadata.version`; package.json (`0.1.0`) ist
  nur Basis für lokale Builds.
- **Web:** Continuous Deployment (kein Versionsetikett).

## Transkriptionsmodell

- Default: **`gpt-4o-mini-transcribe`** (schneller/genauer als das alte `whisper-1`).
- Pro Anfrage übersteuerbar über das Feld `model`
  (`gpt-4o-mini-transcribe` / `gpt-4o-transcribe` / `whisper-1`).
- In den Einstellungen wählbar (Windows-Desktop + Android). Engpass der Reaktionszeit ist
  fast vollständig die Transkriptions-API; alles andere (Audio-Transfer, Einfügen) ist ~0.4 s.

## Windows-Eigenheiten (Electron)

- **Hotkey „Strg+Win" = Halten zum Sprechen** über einen Low-Level-Keyboard-Hook
  (`uiohook-napi`, `src/main/pushToTalk.ts`). Grund: Electrons `globalShortcut`
  (Win32 `RegisterHotKey`) kann keine reinen Modifier-Kombis. Normale Hotkeys (F10,
  Strg+Shift+Leertaste) laufen weiter als Toggle über `globalShortcut`.
- Gehaltene/wiederholte Tasten: 700 ms Entprellung im `toggle()`; zusätzlich 90 s-Watchdog,
  damit der Zustand nie dauerhaft in „processing" strandet.
- **Build:** `npmRebuild: false` in der electron-builder-Config zwingend (uiohook liefert
  N-API-Prebuilds; ein Rebuild via node-gyp scheitert ohne VS-Build-Tools). `asarUnpack`
  für die native `.node`-Binary nötig.
- **Build-Stolperfalle:** Lokale Builds erzeugen sporadisch eine abgeschnittene
  `Blitztext.exe` (Virenscanner greift während des asar-Integrity-Schreibens ein) → Start
  scheitert mit *"not a valid application for this OS platform"* (Fehler 193). Gegenmittel:
  Build in einer Verify-Retry-Schleife — nach jedem `electron-builder --win --dir` prüfen, ob
  die EXE-Grösse der Original-`electron.exe` entspricht **und** startet; sonst `win-unpacked`
  löschen und neu bauen. Vor dem Build immer laufende `Blitztext`-Prozesse beenden (Datei-Lock).
- **Log:** `%APPDATA%\blitztext-windows\blitztext.log` (userData nutzt den package-Namen
  `blitztext-windows`, nicht den productName „Blitztext").

## Offene Punkte

- **Android-Signatur härten** vor einem App-Store-Launch (Signatur-Verwaltung migrieren).
- **macOS** (`BlitztextMac/`): neues Modell / Modell-Wähler noch nicht nachgezogen.
- **Dependabot-PRs**: offene CI-Dependency-Updates, bei Gelegenheit prüfen.
