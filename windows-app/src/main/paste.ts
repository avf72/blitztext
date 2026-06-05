// Text in die Zwischenablage schreiben und in die aktive App einfuegen.
// Einfuegen via PowerShell SendKeys (^v) - keine nativen Module noetig.

import { clipboard } from "electron";
import { spawn } from "node:child_process";

export function copyToClipboard(text: string): void {
  clipboard.writeText(text);
}

/** Simuliert Strg+V im aktuell fokussierten Fenster (der Ziel-App). */
export function pasteIntoActiveApp(): Promise<void> {
  return new Promise((resolve) => {
    const ps = spawn(
      "powershell.exe",
      [
        "-NoProfile",
        "-STA",
        "-Command",
        "Add-Type -AssemblyName System.Windows.Forms; [System.Windows.Forms.SendKeys]::SendWait('^v')",
      ],
      { windowsHide: true }
    );
    ps.on("close", () => resolve());
    ps.on("error", () => resolve());
  });
}
