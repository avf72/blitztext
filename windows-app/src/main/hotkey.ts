// Globaler Hotkey (Toggle-Modus: druecken = Start, nochmal druecken = Stop).

import { globalShortcut } from "electron";
import { getSettings } from "./store";
import { toggle } from "./controller";
import { log } from "./log";

let registered: string | null = null;

export function registerHotkey(): boolean {
  unregisterHotkey();
  const accelerator = getSettings().hotkey;
  log(`Registriere Hotkey: "${accelerator}"`);
  const ok = globalShortcut.register(accelerator, () => {
    log(`Hotkey ausgeloest: "${accelerator}"`);
    toggle();
  });
  log(`Hotkey-Registrierung: ${ok ? "OK" : "FEHLGESCHLAGEN (bereits belegt?)"}`);
  if (ok) registered = accelerator;
  return ok;
}

export function unregisterHotkey(): void {
  if (registered) {
    globalShortcut.unregister(registered);
    registered = null;
  }
}
