// Einstellungen + verschluesselter API-Key.
// Key wird via Electrons safeStorage (Windows DPAPI) verschluesselt abgelegt.

import { app, safeStorage } from "electron";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import type { Tone, EmojiDensity } from "./prompts";

export type WorkflowType = "transcription" | "textImprover" | "dampfAblassen" | "emojiText";

export interface Settings {
  workflow: WorkflowType;
  hotkey: string;
  language: string;
  tone: Tone;
  emojiDensity: EmojiDensity;
  customTerms: string[];
  context: string;
}

const DEFAULTS: Settings = {
  workflow: "transcription",
  hotkey: "CommandOrControl+Space",
  language: "de",
  tone: "neutral",
  emojiDensity: "mittel",
  customTerms: [],
  context: "",
};

interface StoredFile extends Settings {
  apiKeyEnc?: string; // base64 der verschluesselten Bytes
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
      cache = { ...DEFAULTS, ...parsed };
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

export function getSettings(): Settings {
  const { apiKeyEnc, ...settings } = read();
  return settings;
}

export function saveSettings(partial: Partial<Settings>): Settings {
  const current = read();
  const next: StoredFile = { ...current, ...partial };
  write(next);
  return getSettings();
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
