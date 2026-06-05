# Blitztext fuer Windows — Installations-Anleitung

## Voraussetzungen

- Windows 10 oder Windows 11
- OpenAI API Key (mit Zugriff auf `whisper-1`, `gpt-4o-mini`, `gpt-4o`)
  → Key erstellen: https://platform.openai.com/api-keys

---

## Installation (Installer)

1. Installer herunterladen: https://github.com/avf72/Blitztext/releases/tag/windows-latest  
   Datei `Blitztext-Setup.exe` herunterladen.

   > **Browser-Warnung beim Download:** Chrome und Edge blockieren unsignierte `.exe`-Dateien.  
   > - **Chrome:** Drei-Punkte-Menue neben dem blockierten Download → **Beibehalten**  
   > - **Edge:** **Weitere Informationen** → **Trotzdem beibehalten**  
   > Die Warnung erscheint, weil die App kein kostenpflichtiges Code-Signing-Zertifikat hat — der Code ist auf GitHub einsehbar.

2. Windows zeigt eventuell eine SmartScreen-Warnung ("unbekannter Herausgeber") — auf **Trotzdem ausfuehren** klicken.
3. Installer durchlaufen lassen. Blitztext wird installiert und startet automatisch.
4. Im System-Tray (Taskleiste unten rechts) erscheint das Blitztext-Symbol.

---

## Einrichtung beim ersten Start

1. Das Einstellungsfenster oeffnet sich automatisch.
2. **API Key** eintragen (wird verschluesselt gespeichert, verlasst das Geraet nie).
3. **Modus** waehlen:
   | Modus | Funktion |
   |---|---|
   | Blitztext | Reine Transkription |
   | Blitztext+ | Transkription + Lektorat |
   | Blitztext $%&! | Frust-Nachricht wird ruhig und sachlich |
   | Blitztext :) | Transkription + passende Emojis |
4. **Hotkey** waehlen (Standard: `Strg + Shift + Leertaste`).
5. **Speichern** klicken.

---

## Bedienung

1. Cursor in ein Textfeld setzen (E-Mail, Word, Browser, Chat ...).
2. Hotkey druecken → sprechen → Hotkey nochmal druecken.
3. Text wird transkribiert und direkt eingefuegt.

> Falls das automatische Einfuegen nicht klappt: Text liegt in der Zwischenablage → manuell `Strg + V` druecken.

---

## Tray-Menue

Rechtsklick auf das Blitztext-Symbol im System-Tray:
- Modus wechseln
- Einstellungen oeffnen
- App beenden

---

## Sicherheit

- Der API Key wird via Windows DPAPI verschluesselt in  
  `%APPDATA%\blitztext-windows\blitztext-settings.json` abgelegt.
- Audio und Text gehen direkt an die OpenAI-API. Kein eigener Server.

---

## Haeufige Probleme

| Problem | Loesung |
|---|---|
| SmartScreen blockiert den Installer | "Trotzdem ausfuehren" waehlen |
| Kein Text wird eingefuegt | `Strg + V` manuell druecken; App als Administrator starten |
| API-Fehler | API Key pruefen; Guthaben auf platform.openai.com pruefen |
| Symbol nicht im Tray | App manuell starten: Startmenue → "Blitztext" |
