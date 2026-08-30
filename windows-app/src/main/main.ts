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
import { startCloudLogin, handleCloudCallback, isCloudLoggedIn, cloudLogout } from "./cloudAuth";
import { pullCloudSettings, pushCloudSettings } from "./cloudSettings";

// Custom-Protocol fuer den Cloud-Login-Callback (siehe cloudAuth.ts).
app.setAsDefaultProtocolClient("blitztext");

function findCloudCallback(argv: string[]): string | undefined {
  return argv.find((a) => a.startsWith("blitztext://auth-callback"));
}

// Nur eine Instanz zulassen. Ein zweiter Start holt die Einstellungen nach vorn.
const hasSingleInstanceLock = app.requestSingleInstanceLock();
if (!hasSingleInstanceLock) {
  app.exit(0);
}

if (hasSingleInstanceLock) {
  app.on("second-instance", (_e, argv) => {
    log("Zweite Instanz gestartet — oeffne bestehende Einstellungen");
    const callback = findCloudCallback(argv);
    if (callback) {
      handleCloudCallback(callback).then((ok) => log(`Cloud-Callback verarbeitet: ${ok}`));
    }
    openSettings();
  });
}

// Kaltstart direkt ueber den Protocol-Callback (App war noch nicht offen).
const initialCloudCallback = findCloudCallback(process.argv);

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

  if (initialCloudCallback) {
    handleCloudCallback(initialCloudCallback).then((ok) =>
      log(`Cloud-Callback (Kaltstart) verarbeitet: ${ok}`)
    );
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

// --- IPC: Cloud-Sync (geteilte Einstellungen mit Web/Android) ---
ipcMain.handle("cloud:login", () => {
  startCloudLogin();
  return true;
});

ipcMain.handle("cloud:logout", () => {
  cloudLogout();
  return true;
});

ipcMain.handle("cloud:status", () => ({ loggedIn: isCloudLoggedIn() }));

ipcMain.handle("cloud:pull", async () => {
  const remote = await pullCloudSettings();
  if (!remote) return { ok: false };
  const next = saveSettings(remote);
  rebuildMenu();
  return { ok: true, settings: next };
});

ipcMain.handle("cloud:push", async () => {
  const ok = await pushCloudSettings(getSettings());
  return { ok };
});
