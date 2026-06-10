// "Halten zum Sprechen" fuer reine Modifier-Kombis (z.B. Strg+Win).
// Electrons globalShortcut (Win32 RegisterHotKey) kann keine Modifier-only-Kombis
// registrieren. Wir nutzen daher einen systemweiten Low-Level-Keyboard-Hook
// (uiohook-napi) und erkennen, wenn alle geforderten Modifier gleichzeitig
// gehalten werden: gedrueckt = Aufnahme laeuft, losgelassen = fertig.

import { uIOhook, UiohookKey } from "uiohook-napi";
import { log } from "./log";

type KeyGroup = number[]; // links/rechts-Varianten desselben Modifiers

// Electron-Accelerator-Modifier -> moegliche Keycodes (linke + rechte Taste)
const GROUPS: Record<string, KeyGroup> = {
  CommandOrControl: [UiohookKey.Ctrl, UiohookKey.CtrlRight],
  Control: [UiohookKey.Ctrl, UiohookKey.CtrlRight],
  Ctrl: [UiohookKey.Ctrl, UiohookKey.CtrlRight],
  Command: [UiohookKey.Meta, UiohookKey.MetaRight],
  Super: [UiohookKey.Meta, UiohookKey.MetaRight],
  Meta: [UiohookKey.Meta, UiohookKey.MetaRight],
  Alt: [UiohookKey.Alt, UiohookKey.AltRight],
  Option: [UiohookKey.Alt, UiohookKey.AltRight],
  Shift: [UiohookKey.Shift, UiohookKey.ShiftRight],
};

let hookRunning = false;
let recording = false;
let requiredGroups: KeyGroup[] = [];
let onStart: () => void = () => {};
let onStop: () => void = () => {};
let listenersBound = false;
const heldKeys = new Set<number>();

function allGroupsHeld(): boolean {
  return (
    requiredGroups.length > 0 &&
    requiredGroups.every((group) => group.some((code) => heldKeys.has(code)))
  );
}

function evaluate(): void {
  const satisfied = allGroupsHeld();
  if (satisfied && !recording) {
    recording = true;
    log("Push-to-Talk: Kombination gehalten -> Aufnahme startet");
    onStart();
  } else if (!satisfied && recording) {
    recording = false;
    log("Push-to-Talk: losgelassen -> Aufnahme stoppt");
    onStop();
  }
}

function bindListeners(): void {
  if (listenersBound) return;
  uIOhook.on("keydown", (e) => {
    if (!hookRunning) return;
    heldKeys.add(e.keycode);
    evaluate();
  });
  uIOhook.on("keyup", (e) => {
    if (!hookRunning) return;
    heldKeys.delete(e.keycode);
    evaluate();
  });
  listenersBound = true;
}

/** Hook fuer eine Modifier-only-Kombi starten. Gibt false zurueck, wenn nicht moeglich. */
export function startPushToTalk(
  accelerator: string,
  handlers: { start: () => void; stop: () => void }
): boolean {
  stopPushToTalk();

  const parts = accelerator.split("+").map((p) => p.trim()).filter(Boolean);
  const groups = parts.map((p) => GROUPS[p]).filter(Boolean) as KeyGroup[];
  if (groups.length < 2 || groups.length !== parts.length) {
    log(`Push-to-Talk: "${accelerator}" wird nicht unterstuetzt (nicht-Modifier-Taste?)`);
    return false;
  }

  requiredGroups = groups;
  onStart = handlers.start;
  onStop = handlers.stop;
  heldKeys.clear();
  recording = false;
  bindListeners();

  try {
    uIOhook.start();
    hookRunning = true;
    log(`Push-to-Talk aktiv (Halten zum Sprechen) fuer "${accelerator}"`);
    return true;
  } catch (err) {
    log(`Push-to-Talk Start fehlgeschlagen: ${err instanceof Error ? err.message : String(err)}`);
    hookRunning = false;
    return false;
  }
}

export function stopPushToTalk(): void {
  if (hookRunning) {
    try {
      uIOhook.stop();
    } catch {
      // ignore
    }
    hookRunning = false;
  }
  if (recording) {
    recording = false;
    onStop();
  }
  heldKeys.clear();
  requiredGroups = [];
}
