// Globaler Hotkey (Toggle-Modus: druecken = Start, nochmal druecken = Stop).

import { globalShortcut } from "electron";
import { getSettings } from "./store";
import { toggle } from "./controller";

let registered: string | null = null;

export function registerHotkey(): boolean {
  unregisterHotkey();
  const accelerator = getSettings().hotkey;
  const ok = globalShortcut.register(accelerator, toggle);
  if (ok) registered = accelerator;
  return ok;
}

export function unregisterHotkey(): void {
  if (registered) {
    globalShortcut.unregister(registered);
    registered = null;
  }
}
