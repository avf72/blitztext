# Blitztext fuer Android — Installations-Anleitung

## Voraussetzungen

- Android 8.0 oder neuer (API Level 26+)
- Blitztext-Konto (kostenlos erstellen unter https://blitztext-web.vercel.app)

---

## Installation (APK)

Da Blitztext nicht im Play Store ist, muss die APK manuell installiert werden.

### Schritt 1 — APK herunterladen

Download: https://github.com/avf72/Blitztext/releases/tag/latest

Die Datei `blitztext.apk` herunterladen (direkt auf dem Android-Geraet oeffnen, oder zuerst auf den PC laden und dann uebertragen).

### Schritt 2 — APK auf das Geraet uebertragen

- APK-Datei per USB, Google Drive, WhatsApp oder E-Mail ans Geraet senden (falls nicht direkt heruntergeladen).

### Schritt 3 — Installation aus unbekannten Quellen erlauben

1. **Einstellungen** oeffnen.
2. **Apps** → **Spezieller App-Zugriff** → **Unbekannte Apps installieren**.
3. Die App auswaehlen, ueber die du die APK oeffnest (z.B. "Dateien" oder "Chrome").
4. **Installation aus dieser Quelle erlauben** aktivieren.

### Schritt 4 — APK installieren

1. APK-Datei im Datei-Manager oder Download-Ordner antippen.
2. **Installieren** bestaetigen.
3. Nach der Installation **Oeffnen** tippen.

---

## Einrichtung beim ersten Start

1. Mit deinem Blitztext-Konto **anmelden** (Google oder E-Mail).
2. Blitztext fordert folgende Berechtigungen an — alle bestaetigen:
   | Berechtigung | Wozu |
   |---|---|
   | Mikrofon | Sprachaufnahme |
   | Ueber anderen Apps anzeigen | Overlay-Schaltflaeche in jeder App |
   | Benachrichtigungen | Aufnahme-Status im Hintergrund |

---

## Bedienung

1. Die schwebende **Blitztext-Schaltflaeche** erscheint ueber allen Apps.
2. In eine beliebige App wechseln (E-Mail, WhatsApp, Notizen ...) und Cursor ins Textfeld setzen.
3. Schaltflaeche antippen → sprechen → nochmal antippen.
4. Text wird transkribiert und direkt eingefuegt.

---

## Overlay-Schaltflaeche verwalten

- Ueber das **Blitztext-App-Symbol** in der Statusleiste oder im Bereich "Aktive Apps" kann der Dienst gestartet und gestoppt werden.
- Die Position der Schaltflaeche kann per Drag angepasst werden.

---

## In-App-Update

Wenn eine neue Version verfuegbar ist, erscheint in den **Einstellungen** ein Hinweis.  
Tippe auf **Update installieren** — die neue APK wird automatisch heruntergeladen und installiert.

---

## Haeufige Probleme

| Problem | Loesung |
|---|---|
| Installation wird blockiert | "Unbekannte Quellen" fuer die Datei-App erlauben (Schritt 2) |
| Overlay erscheint nicht | Einstellungen → Apps → Blitztext → "Ueber anderen Apps anzeigen" aktivieren |
| Text wird nicht eingefuegt | Cursor vor der Aufnahme ins Textfeld setzen |
| Mikrofon-Fehler | Einstellungen → Apps → Blitztext → Berechtigungen → Mikrofon aktivieren |
| Kein Guthaben | In den Einstellungen auf "OpenAI-Guthaben laden" tippen |
