// Einstellungen + verschluesselter API-Key.
// Key wird via Electrons safeStorage (Windows DPAPI) verschluesselt abgelegt.

import { app, safeStorage } from "electron";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import type { Tone, EmojiDensity } from "./prompts";

export type WorkflowType = "transcription" | "textImprover" | "dampfAblassen" | "emojiText";

export type TranscriptionModel = "gpt-4o-mini-transcribe" | "gpt-4o-transcribe" | "whisper-1";

export const TRANSCRIPTION_MODELS: TranscriptionModel[] = [
  "gpt-4o-mini-transcribe",
  "gpt-4o-transcribe",
  "whisper-1",
];

export const DEFAULT_TRANSCRIPTION_MODEL: TranscriptionModel = "gpt-4o-mini-transcribe";

export interface Settings {
  workflow: WorkflowType;
  hotkey: string;
  language: string;
  tone: Tone;
  emojiDensity: EmojiDensity;
  customTerms: string[];
  context: string;
  transcriptionModel: TranscriptionModel;
}

export const DEFAULT_HOTKEY = "F10";

const DEFAULTS: Settings = {
  workflow: "transcription",
  hotkey: DEFAULT_HOTKEY,
  language: "de",
  tone: "neutral",
  emojiDensity: "mittel",
  customTerms: [],
  context: "",
  transcriptionModel: DEFAULT_TRANSCRIPTION_MODEL,
};

export interface CloudTokens {
  accessToken: string;
  refreshToken: string;
  expiresAt: number; // Unix-Sekunden
  userId: string;
}

interface StoredFile extends Settings {
  apiKeyEnc?: string; // base64 der verschluesselten Bytes
  cloudAuthEnc?: string; // base64 der verschluesselten CloudTokens (JSON)
}

let cache: StoredFile | null = null;

function filePath(): string {
  return join(app.getPath("userData"), "blitztext-settings.json");
}

function read(): StoredFile {
  if (cache) return cache;
  const path = filePath();
  if (existsSync(path)) {
    try {
      const parsed = JSON.parse(readFileSync(path, "utf-8"));
      cache = migrateSettings({ ...DEFAULTS, ...parsed });
      if (JSON.stringify(cache) !== JSON.stringify({ ...DEFAULTS, ...parsed })) {
        write(cache);
      }
      return cache!;
    } catch {
      // korrupte Datei -> Defaults
    }
  }
  cache = { ...DEFAULTS };
  return cache;
}

function write(data: StoredFile): void {
  cache = data;
  writeFileSync(filePath(), JSON.stringify(data, null, 2), "utf-8");
}

function migrateSettings(data: StoredFile): StoredFile {
  const hotkey = normalizeHotkey(data.hotkey);
  // Alte, nicht mehr genutzte Default-Hotkeys auf den aktuellen Standard ziehen.
  if (hotkey === "F8" || hotkey === "F9") {
    return { ...data, hotkey: DEFAULT_HOTKEY };
  }
  return { ...data, hotkey };
}

export function getSettings(): Settings {
  const { apiKeyEnc, ...settings } = read();
  return { ...settings, hotkey: normalizeHotkey(settings.hotkey) };
}

export function saveSettings(partial: Partial<Settings>): Settings {
  const current = read();
  const model = partial.transcriptionModel ?? current.transcriptionModel;
  const next = migrateSettings({
    ...current,
    ...partial,
    hotkey: normalizeHotkey(partial.hotkey ?? current.hotkey),
    transcriptionModel: TRANSCRIPTION_MODELS.includes(model as TranscriptionModel)
      ? (model as TranscriptionModel)
      : DEFAULT_TRANSCRIPTION_MODEL,
  });
  write(next);
  return getSettings();
}

// Reine Modifier-Kombis (z.B. CommandOrControl+Super) koennen NICHT ueber Electrons
// globalShortcut (Win32 RegisterHotKey) laufen — sie brauchen eine Haupttaste.
// Solche Kombis werden stattdessen ueber einen Low-Level-Keyboard-Hook als
// "Halten zum Sprechen" abgefangen (siehe pushToTalk.ts).
const MODIFIER_TOKENS = new Set([
  "CommandOrControl", "CmdOrCtrl", "Command", "Cmd", "Control", "Ctrl",
  "Alt", "Option", "AltGr", "Shift", "Super", "Meta",
]);

export function isModifierOnlyHotkey(accelerator: string): boolean {
  const parts = accelerator.split("+").map((p) => p.trim()).filter(Boolean);
  return parts.length >= 2 && parts.every((p) => MODIFIER_TOKENS.has(p));
}

export function normalizeHotkey(input: string): string {
  const raw = input.trim();
  if (!raw) return DEFAULTS.hotkey;

  const aliases: Record<string, string> = {
    cmdorctrl: "CommandOrControl",
    commandorcontrol: "CommandOrControl",
    ctrl: "CommandOrControl",
    control: "CommandOrControl",
    strg: "CommandOrControl",
    steuerung: "CommandOrControl",
    cmd: "Command",
    command: "Command",
    meta: "Meta",
    win: "Super",
    windows: "Super",
    super: "Super",
    shift: "Shift",
    umschalt: "Shift",
    umschalttaste: "Shift",
    alt: "Alt",
    option: "Alt",
    space: "Space",
    leer: "Space",
    leertaste: "Space",
    return: "Enter",
    enter: "Enter",
    eingabe: "Enter",
    esc: "Escape",
    escape: "Escape",
    tab: "Tab",
  };

  return raw
    .replace(/\s*\+\s*/g, "+")
    .split("+")
    .map((part) => {
      const compact = part.toLowerCase().replace(/[\s_-]/g, "");
      return aliases[compact] ?? part.trim();
    })
    .filter(Boolean)
    .join("+");
}

export function setApiKey(key: string): void {
  const current = read();
  const trimmed = key.trim();
  if (trimmed === "") {
    delete current.apiKeyEnc;
  } else if (safeStorage.isEncryptionAvailable()) {
    current.apiKeyEnc = safeStorage.encryptString(trimmed).toString("base64");
  } else {
    // Fallback ohne OS-Verschluesselung (sollte auf Windows nicht eintreten)
    current.apiKeyEnc = Buffer.from(trimmed, "utf-8").toString("base64");
  }
  write(current);
}

export function getApiKey(): string | null {
  const { apiKeyEnc } = read();
  if (!apiKeyEnc) return null;
  try {
    const bytes = Buffer.from(apiKeyEnc, "base64");
    if (safeStorage.isEncryptionAvailable()) {
      return safeStorage.decryptString(bytes);
    }
    return bytes.toString("utf-8");
  } catch {
    return null;
  }
}

export function hasApiKey(): boolean {
  return getApiKey() !== null;
}

export function maskedApiKey(): string {
  const key = getApiKey();
  if (!key) return "";
  if (key.length > 8) return key.slice(0, 4) + " ••••••••";
  return "••••••••";
}

export function setCloudTokens(tokens: CloudTokens): void {
  const current = read();
  const json = JSON.stringify(tokens);
  current.cloudAuthEnc = safeStorage.isEncryptionAvailable()
    ? safeStorage.encryptString(json).toString("base64")
    : Buffer.from(json, "utf-8").toString("base64");
  write(current);
}

export function getCloudTokens(): CloudTokens | null {
  const { cloudAuthEnc } = read();
  if (!cloudAuthEnc) return null;
  try {
    const bytes = Buffer.from(cloudAuthEnc, "base64");
    const json = safeStorage.isEncryptionAvailable()
      ? safeStorage.decryptString(bytes)
      : bytes.toString("utf-8");
    return JSON.parse(json) as CloudTokens;
  } catch {
    return null;
  }
}

export function clearCloudTokens(): void {
  const current = read();
  delete current.cloudAuthEnc;
  write(current);
}
