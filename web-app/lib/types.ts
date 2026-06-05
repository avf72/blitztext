// Geteilte Typen, gespiegelt aus windows-app/src/main/store.ts + prompts.ts

export type WorkflowType =
  | "transcription"
  | "textImprover"
  | "dampfAblassen"
  | "emojiText";

export type Tone = "formal" | "neutral" | "casual";
export type EmojiDensity = "wenig" | "mittel" | "viel";

export interface Settings {
  workflow: WorkflowType;
  language: string;
  tone: Tone;
  emojiDensity: EmojiDensity;
  customTerms: string[];
  context: string;
}

export const DEFAULT_SETTINGS: Settings = {
  workflow: "transcription",
  language: "de",
  tone: "neutral",
  emojiDensity: "mittel",
  customTerms: [],
  context: "",
};

export const WORKFLOW_LABELS: Record<WorkflowType, string> = {
  transcription: "Blitztext — Sprache rein. Text raus.",
  textImprover: "Blitztext+ — Geschrieben sprechen.",
  dampfAblassen: "Blitztext $%&! — Frust rein. Entspannt raus.",
  emojiText: "Blitztext :) — Text rein. Emojis dazu.",
};
