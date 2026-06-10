// OpenAI-Aufrufe: Whisper-Transkription + Chat-Rewrite.
// Portiert aus BlitztextMac/Services/TranscriptionService.swift und LLMService.swift

import { getApiKey, DEFAULT_TRANSCRIPTION_MODEL, type TranscriptionModel } from "./store";

const TRANSCRIBE_URL = "https://api.openai.com/v1/audio/transcriptions";
const CHAT_URL = "https://api.openai.com/v1/chat/completions";

export type RewriteModel = "gpt-4o-mini" | "gpt-4o";

export class ConfigError extends Error {
  constructor() {
    super("OpenAI API Key fehlt. Bitte in den Einstellungen hinterlegen.");
  }
}

function authHeader(): string {
  const key = getApiKey();
  if (!key) throw new ConfigError();
  return `Bearer ${key}`;
}

async function errorMessage(res: Response): Promise<string> {
  try {
    const data = (await res.json()) as { error?: { message?: string } };
    return data.error?.message ?? `Status ${res.status}`;
  } catch {
    return `Status ${res.status}`;
  }
}

/** Audio (webm) an Whisper senden, Klartext zurueck. */
export async function transcribe(
  audio: Buffer,
  language: string,
  customTerms: string[],
  model: TranscriptionModel = DEFAULT_TRANSCRIPTION_MODEL
): Promise<string> {
  const auth = authHeader();

  const form = new FormData();
  const blob = new Blob([new Uint8Array(audio)], { type: "audio/webm" });
  form.append("file", blob, "audio.webm");
  form.append("model", model);
  form.append("response_format", "text");
  if (customTerms.length > 0) {
    form.append("prompt", `Eigennamen und Begriffe: ${customTerms.join(", ")}`);
  }
  if (language.trim() !== "") {
    form.append("language", language.trim());
  }

  const res = await fetch(TRANSCRIBE_URL, {
    method: "POST",
    headers: { Authorization: auth, Accept: "text/plain, application/json" },
    body: form,
    signal: AbortSignal.timeout(60_000),
  });

  if (!res.ok) {
    throw new Error(`OpenAI-Fehler: ${await errorMessage(res)}`);
  }

  const text = (await res.text()).trim();
  if (text === "") throw new Error("OpenAI-Fehler: Transkription fehlgeschlagen");
  return text;
}

/** Text mit System-Prompt umschreiben. */
export async function rewrite(
  text: string,
  systemPrompt: string,
  model: RewriteModel,
  temperature: number
): Promise<string> {
  const auth = authHeader();

  const res = await fetch(CHAT_URL, {
    method: "POST",
    headers: { Authorization: auth, "Content-Type": "application/json" },
    body: JSON.stringify({
      model,
      temperature,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: text },
      ],
    }),
    signal: AbortSignal.timeout(45_000),
  });

  if (!res.ok) {
    throw new Error(`Fehler von OpenAI: ${await errorMessage(res)}`);
  }

  const data = (await res.json()) as {
    choices?: { message?: { content?: string } }[];
  };
  const content = data.choices?.[0]?.message?.content?.trim();
  if (!content) throw new Error("Keine Antwort erhalten. Bitte nochmal versuchen.");
  return content;
}
