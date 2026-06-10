// Globaler Hotkey.
// - Normale Hotkeys (F10, Strg+Shift+Leertaste): Toggle ueber Electrons globalShortcut.
// - Reine Modifier-Kombis (Strg+Win): "Halten zum Sprechen" ueber Low-Level-Hook.

import { globalShortcut } from "electron";
import { DEFAULT_HOTKEY, getSettings, normalizeHotkey, isModifierOnlyHotkey } from "./store";
import { toggle, pttStart, pttStop } from "./controller";
import { startPushToTalk, stopPushToTalk } from "./pushToTalk";
import { log } from "./log";

let registered: string | null = null;
let requested: string | null = null;
let kind: "none" | "global" | "ptt" = "none";

export function registerHotkey(): boolean {
  unregisterHotkey();
  const accelerator = normalizeHotkey(getSettings().hotkey);
  requested = accelerator;
  log(`Registriere Hotkey: "${accelerator}"`);

  // Modifier-only-Kombi -> Push-to-Talk (Halten zum Sprechen)
  if (isModifierOnlyHotkey(accelerator)) {
    if (startPushToTalk(accelerator, { start: pttStart, stop: pttStop })) {
      registered = accelerator;
      kind = "ptt";
      log(`Hotkey-Registrierung: OK (Halten zum Sprechen) "${accelerator}"`);
      return true;
    }
    log(`Push-to-Talk fuer "${accelerator}" fehlgeschlagen — Fallback auf Standard-Hotkey`);
  }

  // Normale Hotkeys ueber globalShortcut. Modifier-only-Eintraege hier ueberspringen.
  const candidates = [accelerator, DEFAULT_HOTKEY, "CommandOrControl+Shift+Space"].filter(
    (value, index, all) =>
      value && !isModifierOnlyHotkey(value) && all.indexOf(value) === index
  );

  for (const candidate of candidates) {
    const ok = globalShortcut.register(candidate, () => {
      log(`Hotkey ausgeloest: "${candidate}"`);
      toggle();
    });

    if (ok) {
      registered = candidate;
      kind = "global";
      log(
        candidate === accelerator
          ? "Hotkey-Registrierung: OK"
          : `Hotkey-Registrierung: OK mit Fallback "${candidate}"`
      );
      return true;
    }

    log(`Hotkey-Registrierung fuer "${candidate}": FEHLGESCHLAGEN (bereits belegt?)`);
  }

  return false;
}

export function unregisterHotkey(): void {
  if (kind === "global" && registered) {
    globalShortcut.unregister(registered);
  }
  if (kind === "ptt") {
    stopPushToTalk();
  }
  registered = null;
  kind = "none";
}

export function getHotkeyRegistration(): {
  requested: string | null;
  active: string | null;
  kind: "none" | "global" | "ptt";
} {
  return { requested, active: registered, kind };
}
