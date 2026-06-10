// App-Einstieg: Tray-only-App, Hotkey, IPC-Verdrahtung.

import { app, ipcMain, session, shell } from "electron";
import { log } from "./log";
import { createTray, rebuildMenu } from "./tray";
import { checkUpdate, downloadAndRunInstaller } from "./update";
import { OPENAI_BILLING } from "./constants";
import { registerHotkey, unregisterHotkey } from "./hotkey";
import { getHotkeyRegistration } from "./hotkey";
import { getOverlay, markOverlayReady, openSettings } from "./windows";
import { currentState, handleAudio, toggle } from "./controller";
import { runSmoke } from "./smoke";
import {
  getSettings,
  saveSettings,
  setApiKey,
  hasApiKey,
  maskedApiKey,
  type Settings,
} from "./store";

// Nur eine Instanz zulassen. Ein zweiter Start holt die Einstellungen nach vorn.
const hasSingleInstanceLock = app.requestSingleInstanceLock();
if (!hasSingleInstanceLock) {
  app.exit(0);
}

if (hasSingleInstanceLock) {
  app.on("second-instance", () => {
    log("Zweite Instanz gestartet — oeffne bestehende Einstellungen");
    openSettings();
  });
}

if (hasSingleInstanceLock) app.whenReady().then(() => {
  log(`App gestartet — Version ${app.getVersion()}`);
  // Mikrofon-Berechtigung im Renderer erlauben
  session.defaultSession.setPermissionRequestHandler((_wc, permission, callback) => {
    callback(permission === "media");
  });

  getOverlay(); // Overlay vorab erzeugen (versteckt)
  createTray();

  if (!registerHotkey()) {
    log("Hotkey konnte nicht registriert werden — oeffne Einstellungen");
    openSettings();
  }

  if (!hasApiKey()) {
    log("Kein API Key — oeffne Einstellungen");
    openSettings();
  }

  if (process.env.BLITZTEXT_SMOKE) {
    runSmoke(process.env.BLITZTEXT_SMOKE);
  }
});

// Tray-App bleibt offen, auch wenn Fenster geschlossen werden (leerer Handler
// verhindert das Standard-Beenden bei geschlossenen Fenstern).
app.on("window-all-closed", () => {});
app.on("will-quit", () => unregisterHotkey());

// --- IPC: Audio vom Overlay ---
ipcMain.on("audio", (_e, payload: { buffer: ArrayBuffer; duration: number }) => {
  const bytes = payload?.buffer?.byteLength ?? 0;
  log(`IPC "audio" empfangen: ${bytes} Bytes, ${payload?.duration ?? 0}s`);
  handleAudio(Buffer.from(payload.buffer), payload.duration);
});

ipcMain.on("renderer:log", (_e, message: string) => {
  log(`Renderer: ${message}`);
});

ipcMain.on("overlay:ready", () => {
  markOverlayReady();
  log("Overlay bereit gemeldet");
});

// --- IPC: Einstellungen ---
ipcMain.handle("settings:get", () => {
  log("Einstellungen abgerufen — registriere Hotkey neu fuer Statusanzeige");
  let settings = getSettings();
  registerHotkey();
  const hotkeyRegistration = getHotkeyRegistration();
  log(`Hotkey-Status beim Einstellungsabruf: ${JSON.stringify(hotkeyRegistration)}`);
  if (
    hotkeyRegistration.active &&
    settings.hotkey !== hotkeyRegistration.active
  ) {
    log(`Uebernehme aktiven Hotkey "${hotkeyRegistration.active}" statt "${settings.hotkey}"`);
    settings = saveSettings({ hotkey: hotkeyRegistration.active });
  }
  rebuildMenu();

  return {
    settings,
    hotkeyRegistration,
    appVersion: app.getVersion(),
    hasKey: hasApiKey(),
    maskedKey: maskedApiKey(),
  };
});

ipcMain.handle("settings:save", (_e, partial: Partial<Settings>) => {
  const next = saveSettings(partial);
  if (partial.hotkey) {
    log(`Einstellungen speichern: Hotkey "${next.hotkey}"`);
    registerHotkey();
    log(`Hotkey-Status nach Speichern: ${JSON.stringify(getHotkeyRegistration())}`);
  }
  rebuildMenu();
  return next;
});

ipcMain.handle("apikey:set", (_e, key: string) => {
  setApiKey(key);
  return { hasKey: hasApiKey(), maskedKey: maskedApiKey() };
});

ipcMain.handle("recording:toggle", () => {
  log("Aufnahme per Einstellungsbutton angefordert");
  toggle();
  return { state: currentState() };
});

ipcMain.handle("recording:state", () => ({ state: currentState() }));

// --- IPC: Guthaben-Link + Update ---
ipcMain.handle("billing:open", () => shell.openExternal(OPENAI_BILLING));
ipcMain.handle("app:version", () => app.getVersion());
function quitFromSettings(): void {
  log("App wird ueber Einstellungen beendet");
  unregisterHotkey();
  setTimeout(() => app.exit(0), 25);
}

ipcMain.on("app:quit-now", () => quitFromSettings());
ipcMain.handle("app:quit", () => {
  quitFromSettings();
  return true;
});
ipcMain.handle("update:check", () => checkUpdate());
ipcMain.handle("update:install", () => downloadAndRunInstaller());
