// Zustandsmaschine: Hotkey-Toggle -> Aufnahme -> Transkription -> Rewrite -> Einfuegen.

import { getOverlay, showOverlay, hideOverlay, openSettings, isOverlayReady } from "./windows";
import { getSettings, hasApiKey, type WorkflowType } from "./store";
import { transcribe, rewrite } from "./openai";
import { buildImprovePrompt, DAMPF_ABLASSEN_PROMPT, buildEmojiPrompt } from "./prompts";
import { cleaned, isLikelyArtifact, shouldRejectRecording } from "./quality";
import { correctVocabulary } from "./vocabulary";
import { copyToClipboard, pasteIntoActiveApp } from "./paste";
import { Notification, shell } from "electron";
import { OPENAI_BILLING } from "./constants";
import { log } from "./log";

function isQuotaError(m: string): boolean {
  const l = m.toLowerCase();
  return l.includes("quota") || l.includes("billing") || l.includes("insufficient");
}

function quotaNotification(): void {
  const n = new Notification({
    title: "Kein OpenAI-Guthaben",
    body: "Guthaben aufgebraucht. Klicken, um Guthaben zu laden.",
  });
  n.on("click", () => void shell.openExternal(OPENAI_BILLING));
  n.show();
}

type State = "idle" | "recording" | "processing";
let state: State = "idle";

// Sicherheits-Timeout: wenn die Verarbeitung haengt (z.B. Audio kommt nie an
// oder OpenAI antwortet nicht), darf der Zustand nicht ewig "processing" bleiben.
const PROCESSING_TIMEOUT_MS = 90_000;
let processingWatchdog: ReturnType<typeof setTimeout> | null = null;

function startProcessingWatchdog(): void {
  clearProcessingWatchdog();
  processingWatchdog = setTimeout(() => {
    if (state === "processing") {
      log(`WATCHDOG: Verarbeitung haengt seit ${PROCESSING_TIMEOUT_MS / 1000}s — setze auf idle zurueck.`);
      fail("Zeitueberschreitung bei der Verarbeitung.");
    }
  }, PROCESSING_TIMEOUT_MS);
}

function clearProcessingWatchdog(): void {
  if (processingWatchdog) {
    clearTimeout(processingWatchdog);
    processingWatchdog = null;
  }
}

function status(state: string, text: string): void {
  const win = getOverlay();
  sendToOverlay("status", { state, text });
}

// Entprellung: Gehaltene Tasten loesen Windows-Tastenwiederholung aus, sodass der
// globale Hotkey ~30x/Sekunde feuert. Ohne Cooldown wuerde eine gerade gestartete
// Aufnahme sofort wieder gestoppt — und der Zustand in "processing" stranden.
const TOGGLE_COOLDOWN_MS = 700;
let lastToggleAt = 0;

/** Wird vom globalen Hotkey aufgerufen. */
export function toggle(): void {
  const now = Date.now();
  const sinceLast = now - lastToggleAt;
  if (sinceLast < TOGGLE_COOLDOWN_MS) {
    log(`Toggle ignoriert (Tastenwiederholung, ${sinceLast}ms seit letztem)`);
    return;
  }
  lastToggleAt = now;

  log(`Toggle angefordert, Zustand: ${state}`);
  if (state === "idle") {
    if (!hasApiKey()) {
      log("Keine Aufnahme: API Key fehlt");
      openSettings();
      return;
    }
    startRecording();
  } else if (state === "recording") {
    stopRecording();
  }
  // processing -> ignorieren
}

/** Push-to-Talk: Kombination gedrueckt -> Aufnahme starten. */
export function pttStart(): void {
  log(`Push-to-Talk Start, Zustand: ${state}`);
  if (state !== "idle") return;
  if (!hasApiKey()) {
    log("Keine Aufnahme: API Key fehlt");
    openSettings();
    return;
  }
  startRecording();
}

/** Push-to-Talk: Kombination losgelassen -> Aufnahme stoppen. */
export function pttStop(): void {
  log(`Push-to-Talk Stop, Zustand: ${state}`);
  if (state === "recording") {
    stopRecording();
  }
}

function startRecording(): void {
  log("Aufnahme startet");
  state = "recording";
  showOverlay();
  status("recording", "Aufnahme laeuft ...");
  sendToOverlay("recording:start");
}

function stopRecording(): void {
  log("Aufnahme stoppt — warte auf Audio vom Overlay");
  state = "processing";
  startProcessingWatchdog();
  status("processing", "Wird verarbeitet ...");
  sendToOverlay("recording:stop");
}

function sendToOverlay(channel: string, payload?: unknown): void {
  const win = getOverlay();
  if (win.isDestroyed()) return;

  const send = () => {
    if (!win.isDestroyed()) win.webContents.send(channel, payload);
  };
  const sendWhenReady = (attempt = 0) => {
    if (win.isDestroyed()) return;
    if (isOverlayReady()) {
      send();
      return;
    }
    if (attempt === 0) log(`Overlay noch nicht bereit, warte auf "${channel}"`);
    if (attempt >= 80) {
      log(`Overlay nicht bereit nach Wartezeit, sende "${channel}" trotzdem`);
      send();
      return;
    }
    setTimeout(() => sendWhenReady(attempt + 1), 50);
  };

  if (win.webContents.isLoading()) {
    win.webContents.once("did-finish-load", () => sendWhenReady());
  } else {
    sendWhenReady();
  }
}

/** Audiodaten vom Renderer empfangen und Pipeline starten. */
export async function handleAudio(buffer: Buffer, durationSec: number): Promise<void> {
  log(`handleAudio aufgerufen: ${buffer.byteLength} Bytes, ${durationSec.toFixed(2)}s, Zustand=${state}`);
  if (shouldRejectRecording(durationSec)) {
    log("Aufnahme zu kurz/leer — verworfen");
    return fail("Keine Aufnahme erkannt.");
  }

  const settings = getSettings();
  const vocabularyHints = durationSec >= 0.9 ? settings.customTerms : [];

  try {
    status("processing", "Wird transkribiert ...");
    const t0 = Date.now();
    log(`Sende Audio an OpenAI (Modell: ${settings.transcriptionModel}) ...`);
    const raw = cleaned(correctVocabulary(await transcribe(buffer, settings.language, vocabularyHints, settings.transcriptionModel), settings.customTerms));
    log(`Transkription erhalten nach ${Date.now() - t0}ms: "${raw.slice(0, 60)}"`);
    if (isLikelyArtifact(raw, durationSec)) {
      return fail("Keine Aufnahme erkannt.");
    }

    log(`Wende Workflow an: ${settings.workflow}`);
    const result = await applyWorkflow(settings.workflow, raw, settings);
    if (result === "KEINE_AUFNAHME_ERKANNT") {
      return fail("Keine Aufnahme erkannt.");
    }

    await deliver(cleaned(correctVocabulary(result, settings.customTerms)));
    log("Verarbeitung abgeschlossen, Text eingefuegt");
  } catch (err) {
    const m = err instanceof Error ? err.message : "Unbekannter Fehler";
    log(`Verarbeitung fehlgeschlagen: ${m}`);
    if (isQuotaError(m)) {
      quotaNotification();
      fail("Kein OpenAI-Guthaben.");
    } else {
      fail(m);
    }
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
  clearProcessingWatchdog();
  copyToClipboard(text);
  status("done", "Fertig - eingefuegt");
  hideOverlay();
  // kurze Pause, damit der Fokus sicher bei der Ziel-App liegt
  await new Promise((r) => setTimeout(r, 60));
  await pasteIntoActiveApp();
  state = "idle";
}

function fail(message: string): void {
  clearProcessingWatchdog();
  log(`Fehlerstatus: ${message}`);
  status("error", message);
  setTimeout(() => hideOverlay(), 1600);
  state = "idle";
}

export function currentState(): State {
  return state;
}
