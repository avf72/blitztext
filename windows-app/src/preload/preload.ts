// Sichere Bruecke zwischen Renderer und Main (contextIsolation).

import { contextBridge, ipcRenderer } from "electron";

contextBridge.exposeInMainWorld("blitz", {
  // Overlay: Befehle vom Main empfangen
  onRecordingStart: (cb: () => void) =>
    ipcRenderer.on("recording:start", () => cb()),
  onRecordingStop: (cb: () => void) =>
    ipcRenderer.on("recording:stop", () => cb()),
  onStatus: (cb: (s: { state: string; text: string }) => void) =>
    ipcRenderer.on("status", (_e, s) => cb(s)),

  // Overlay: Audio zurueck an Main
  sendAudio: (buffer: ArrayBuffer, duration: number) =>
    ipcRenderer.send("audio", { buffer, duration }),

  // Einstellungen
  getSettings: () => ipcRenderer.invoke("settings:get"),
  saveSettings: (partial: unknown) => ipcRenderer.invoke("settings:save", partial),
  setApiKey: (key: string) => ipcRenderer.invoke("apikey:set", key),

  // Guthaben + Update
  openBilling: () => ipcRenderer.invoke("billing:open"),
  appVersion: () => ipcRenderer.invoke("app:version"),
  checkUpdate: () => ipcRenderer.invoke("update:check"),
  installUpdate: () => ipcRenderer.invoke("update:install"),
});
