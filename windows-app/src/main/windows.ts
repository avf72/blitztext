// Fenster-Erzeugung: Overlay (Aufnahme/Status) und Einstellungen.

import { app, BrowserWindow, screen } from "electron";
import { join } from "node:path";

const preload = join(__dirname, "../preload/preload.js");

let overlay: BrowserWindow | null = null;
let settings: BrowserWindow | null = null;
let overlayReady = false;

/** Schmales, nicht-fokussierbares Overlay am unteren Bildschirmrand. */
export function getOverlay(): BrowserWindow {
  if (overlay && !overlay.isDestroyed()) return overlay;

  overlayReady = false;
  const { width, height } = screen.getPrimaryDisplay().workAreaSize;
  const w = 280;
  const h = 64;

  overlay = new BrowserWindow({
    width: w,
    height: h,
    x: Math.round((width - w) / 2),
    y: height - h - 24,
    frame: false,
    transparent: true,
    resizable: false,
    movable: false,
    focusable: true,
    skipTaskbar: true,
    alwaysOnTop: true,
    show: false,
    webPreferences: { preload, contextIsolation: true, nodeIntegration: false },
  });
  overlay.setAlwaysOnTop(true, "screen-saver");
  overlay.webContents.on("did-start-loading", () => {
    overlayReady = false;
  });
  overlay.on("closed", () => {
    overlayReady = false;
    overlay = null;
  });
  overlay.loadFile(join(__dirname, "../renderer/overlay.html"));
  return overlay;
}

export function markOverlayReady(): void {
  overlayReady = true;
}

export function isOverlayReady(): boolean {
  return overlayReady;
}

export function showOverlay(): void {
  const win = getOverlay();
  win.showInactive(); // ohne Fokus zu nehmen
}

export function hideOverlay(): void {
  if (overlay && !overlay.isDestroyed()) overlay.hide();
}

export function openSettings(): void {
  if (settings && !settings.isDestroyed()) {
    settings.show();
    settings.focus();
    return;
  }
  settings = new BrowserWindow({
    width: 460,
    height: 640,
    title: `Blitztext Einstellungen ${app.getVersion()}`,
    resizable: false,
    webPreferences: { preload, contextIsolation: true, nodeIntegration: false },
  });
  settings.setMenuBarVisibility(false);
  settings.loadFile(join(__dirname, "../renderer/settings.html"));
  settings.on("close", () => {
    app.quit();
  });
  settings.on("closed", () => {
    settings = null;
  });
}
