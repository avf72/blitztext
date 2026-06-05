// Zustandsmaschine: Hotkey-Toggle -> Aufnahme -> Transkription -> Rewrite -> Einfuegen.

import { getOverlay, showOverlay, hideOverlay, openSettings } from "./windows";
import { getSettings, hasApiKey, type WorkflowType } from "./store";
import { transcribe, rewrite } from "./openai";
import { buildImprovePrompt, DAMPF_ABLASSEN_PROMPT, buildEmojiPrompt } from "./prompts";
import { cleaned, isLikelyArtifact, shouldRejectRecording } from "./quality";
import { copyToClipboard, pasteIntoActiveApp } from "./paste";

type State = "idle" | "recording" | "processing";
let state: State = "idle";

function status(state: string, text: string): void {
  const win = getOverlay();
  if (!win.isDestroyed()) win.webContents.send("status", { state, text });
}

/** Wird vom globalen Hotkey aufgerufen. */
export function toggle(): void {
  if (state === "idle") {
    if (!hasApiKey()) {
      openSettings();
      return;
    }
    startRecording();
  } else if (state === "recording") {
    stopRecording();
  }
  // processing -> ignorieren
}

function startRecording(): void {
  state = "recording";
  showOverlay();
  status("recording", "Aufnahme laeuft ...");
  getOverlay().webContents.send("recording:start");
}

function stopRecording(): void {
  state = "processing";
  status("processing", "Wird verarbeitet ...");
  getOverlay().webContents.send("recording:stop");
}

/** Audiodaten vom Renderer empfangen und Pipeline starten. */
export async function handleAudio(buffer: Buffer, durationSec: number): Promise<void> {
  if (shouldRejectRecording(durationSec)) {
    return fail("Keine Aufnahme erkannt.");
  }

  const settings = getSettings();
  const vocabularyHints = durationSec >= 0.9 ? settings.customTerms : [];

  try {
    status("processing", "Wird transkribiert ...");
    const raw = cleaned(await transcribe(buffer, settings.language, vocabularyHints));
    if (isLikelyArtifact(raw, durationSec)) {
      return fail("Keine Aufnahme erkannt.");
    }

    const result = await applyWorkflow(settings.workflow, raw, settings);
    if (result === "KEINE_AUFNAHME_ERKANNT") {
      return fail("Keine Aufnahme erkannt.");
    }

    await deliver(cleaned(result));
  } catch (err) {
    fail(err instanceof Error ? err.message : "Unbekannter Fehler");
  }
}

async function applyWorkflow(
  workflow: WorkflowType,
  raw: string,
  settings: ReturnType<typeof getSettings>
): Promise<string> {
  switch (workflow) {
    case "transcription":
      return raw;
    case "textImprover":
      status("processing", "Text wird verbessert ...");
      return rewrite(raw, buildImprovePrompt(settings), "gpt-4o-mini", 0.3);
    case "dampfAblassen":
      status("processing", "Wird umformuliert ...");
      return rewrite(raw, DAMPF_ABLASSEN_PROMPT, "gpt-4o", 0.4);
    case "emojiText":
      status("processing", "Emojis werden ergaenzt ...");
      return rewrite(raw, buildEmojiPrompt(settings.emojiDensity), "gpt-4o-mini", 0.3);
  }
}

async function deliver(text: string): Promise<void> {
  copyToClipboard(text);
  status("done", "Fertig - eingefuegt");
  hideOverlay();
  // kurze Pause, damit der Fokus sicher bei der Ziel-App liegt
  await new Promise((r) => setTimeout(r, 120));
  await pasteIntoActiveApp();
  state = "idle";
}

function fail(message: string): void {
  status("error", message);
  setTimeout(() => hideOverlay(), 1600);
  state = "idle";
}

export function currentState(): State {
  return state;
}
