// Dev-Selbsttests, aktiviert via Umgebungsvariable BLITZTEXT_SMOKE.
// "mic"   -> nimmt real ~1.2s auf und prueft, ob Audiodaten ankommen.
// sonst   -> laedt beide Fenster, meldet Renderer-Fehler, beendet sich.

import { app, BrowserWindow, ipcMain } from "electron";
import { getOverlay, openSettings } from "./windows";

export function runSmoke(mode: string): void {
  if (mode === "mic") runMicSmokeTest();
  else runBootSmokeTest();
}

function runMicSmokeTest(): void {
  const overlay = getOverlay();

  ipcMain.once("audio", (_e, p: { buffer: ArrayBuffer; duration: number }) => {
    if (p.buffer.byteLength > 0) {
      console.log(`MIC_OK bytes=${p.buffer.byteLength} duration=${p.duration.toFixed(2)}s`);
      app.exit(0);
    } else {
      console.log("MIC_FAIL: keine Audiodaten (kein Mikrofon?)");
      app.exit(1);
    }
  });

  const run = () => {
    overlay.showInactive();
    overlay.webContents.send("recording:start");
    setTimeout(() => overlay.webContents.send("recording:stop"), 1200);
  };

  if (overlay.webContents.isLoading()) {
    overlay.webContents.once("did-finish-load", run);
  } else {
    run();
  }

  setTimeout(() => {
    console.log("MIC_TIMEOUT: keine Antwort vom Renderer");
    app.exit(1);
  }, 8000);
}

function runBootSmokeTest(): void {
  let renderErrors = 0;
  openSettings();

  for (const win of BrowserWindow.getAllWindows()) {
    win.webContents.on("console-message", (_e, level, message) => {
      if (level >= 2) {
        renderErrors++;
        console.log(`[renderer-error] ${message}`);
      }
    });
    win.webContents.on("render-process-gone", (_e, details) => {
      renderErrors++;
      console.log(`[render-process-gone] ${details.reason}`);
    });
  }

  setTimeout(() => {
    console.log(renderErrors === 0 ? "SMOKE_OK" : `SMOKE_FAIL: ${renderErrors} Renderer-Fehler`);
    app.exit(renderErrors === 0 ? 0 : 1);
  }, 3500);
}
