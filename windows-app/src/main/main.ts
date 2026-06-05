// App-Einstieg: Tray-only-App, Hotkey, IPC-Verdrahtung.

import { app, ipcMain, session, shell } from "electron";
import { log } from "./log";
import { createTray, rebuildMenu } from "./tray";
import { checkUpdate, downloadAndRunInstaller } from "./update";
import { OPENAI_BILLING } from "./constants";
import { registerHotkey, unregisterHotkey } from "./hotkey";
import { getOverlay, openSettings } from "./windows";
import { handleAudio } from "./controller";
import { runSmoke } from "./smoke";
import {
  getSettings,
  saveSettings,
  setApiKey,
  hasApiKey,
  maskedApiKey,
  type Settings,
} from "./store";

// Nur eine Instanz zulassen
if (!app.requestSingleInstanceLock()) {
  app.quit();
}

app.on("second-instance", () => openSettings());

app.whenReady().then(() => {
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
  handleAudio(Buffer.from(payload.buffer), payload.duration);
});

// --- IPC: Einstellungen ---
ipcMain.handle("settings:get", () => ({
  settings: getSettings(),
  hasKey: hasApiKey(),
  maskedKey: maskedApiKey(),
}));

ipcMain.handle("settings:save", (_e, partial: Partial<Settings>) => {
  const next = saveSettings(partial);
  if (partial.hotkey) registerHotkey();
  rebuildMenu();
  return next;
});

ipcMain.handle("apikey:set", (_e, key: string) => {
  setApiKey(key);
  return { hasKey: hasApiKey(), maskedKey: maskedApiKey() };
});

// --- IPC: Guthaben-Link + Update ---
ipcMain.handle("billing:open", () => shell.openExternal(OPENAI_BILLING));
ipcMain.handle("app:version", () => app.getVersion());
ipcMain.handle("update:check", () => checkUpdate());
ipcMain.handle("update:install", () => downloadAndRunInstaller());
