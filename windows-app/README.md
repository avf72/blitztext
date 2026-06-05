# Blitztext fuer Windows

Native Windows-Tray-App nach Vorbild der macOS-App: Hotkey druecken, sprechen, der
fertige Text wird automatisch in die aktive App eingefuegt — analog zu Wispr Flow.

Portiert aus `../BlitztextMac` (Swift) nach Electron + TypeScript.

## Funktionsweise

```
Hotkey -> Mikrofon-Aufnahme -> OpenAI Whisper -> (optional Rewrite per GPT) -> Zwischenablage -> Strg+V in aktive App
```

Vier Modi (per Tray-Menue umschaltbar):

| Modus | Was er macht |
|---|---|
| **Blitztext** | Reine Transkription |
| **Blitztext+** | Transkription + Lektorat (Ton waehlbar) |
| **Blitztext $%&!** | Frust-Nachricht -> ruhige, wirksame Nachricht |
| **Blitztext :)** | Transkription + passende Emojis |

## Voraussetzungen

- Windows 10/11
- Node.js (vorhanden)
- OpenAI API Key mit Zugriff auf `whisper-1`, `gpt-4o-mini`, `gpt-4o`

## Start (Entwicklung)

```powershell
cd windows-app
npm install
npm start
```

Beim ersten Start oeffnet sich das Einstellungsfenster. API Key eintragen, Modus
und Hotkey waehlen, speichern. Standard-Hotkey: `Strg+Shift+Leertaste`.

## Bedienung

1. Cursor in ein beliebiges Textfeld setzen (Mail, Word, Browser, Chat ...).
2. Hotkey druecken -> sprechen -> Hotkey nochmal druecken (Toggle-Modus).
3. Text wird transkribiert, ggf. umgeschrieben und direkt eingefuegt.

Falls das automatische Einfuegen blockiert ist, liegt der Text in der
Zwischenablage und kann mit Strg+V manuell eingefuegt werden.

## Tests

```powershell
npm test          # Logik-Tests (Prompts + Qualitaetsfilter), kein GUI noetig
npm run test:boot # Electron-Boot: laedt beide Fenster, prueft auf Renderer-Fehler -> SMOKE_OK
npm run test:mic  # Echte ~1s Mikrofon-Aufnahme -> MIC_OK + Byte-Anzahl
```

Nicht automatisch testbar (braucht API-Key bzw. Ziel-App): OpenAI-Transkription/Rewrite
und das Auto-Einfuegen in fremde Apps — diese bitte manuell pruefen.

## Paket bauen (.exe Installer)

```powershell
npm run dist
```

Erzeugt einen NSIS-Installer unter `release/`.

## Sicherheit

- Der API Key wird via Windows DPAPI (`safeStorage`) verschluesselt in
  `%APPDATA%/blitztext-windows/blitztext-settings.json` abgelegt.
- Audio und Text gehen direkt an die OpenAI-API. Kein eigener Server.

## Architektur

```
src/
  main/
    main.ts        App-Start, IPC, Tray + Hotkey verdrahten
    controller.ts  Zustandsmaschine: Aufnahme -> Pipeline -> Einfuegen
    openai.ts      Whisper + Chat-Rewrite
    prompts.ts     System-Prompts (1:1 aus der Mac-App)
    quality.ts     Artefakt-Filter fuer kurze Aufnahmen
    paste.ts       Zwischenablage + Strg+V (SendKeys)
    store.ts       Einstellungen + verschluesselter Key
    windows.ts     Overlay- und Einstellungsfenster
    tray.ts        Tray-Menue mit Modus-Auswahl
    hotkey.ts      Globaler Hotkey (Toggle)
  preload/preload.ts   Sichere Renderer-Bruecke
  renderer/
    overlay.html   Aufnahme-Overlay + Mikrofon (getUserMedia/MediaRecorder)
    settings.html  Einstellungsformular
```

## Naechste Schritte

- Push-to-talk (Taste halten) via globalem Keyboard-Hook
- Eigenes App-Icon (.ico)
- Android-App (Accessibility-Service) als zweite Plattform
