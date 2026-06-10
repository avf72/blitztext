// Diktier-Endpoint: Auth -> Qualitaetsfilter -> Rate-Limit -> Whisper -> Workflow.
// Kapselt OpenAI-Key + Prompts + Limit Server-seitig. Node-Runtime (FormData/Blob).
import { NextResponse } from "next/server";
import { getSupabaseForRequest } from "@/lib/supabase/from-request";
import { loadSettings } from "@/lib/settings-service";
import { consumeQuota } from "@/lib/rate-limit";
import {
  transcribe,
  TRANSCRIPTION_MODELS,
  DEFAULT_TRANSCRIPTION_MODEL,
  type TranscriptionModel,
} from "@/lib/openai";
import { applyWorkflow } from "@/lib/workflow";
import { cleaned, isLikelyArtifact, shouldRejectRecording } from "@/lib/quality";
import type { WorkflowType } from "@/lib/types";

export const runtime = "nodejs";
export const maxDuration = 60;

const NO_RECORDING = "Keine Aufnahme erkannt.";
const WORKFLOWS: WorkflowType[] = [
  "transcription",
  "textImprover",
  "dampfAblassen",
  "emojiText",
];

export async function POST(request: Request) {
  const supabase = await getSupabaseForRequest(request);
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Nicht eingeloggt" }, { status: 401 });
  }

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return NextResponse.json({ error: "Ungueltige Anfrage" }, { status: 400 });
  }

  const file = form.get("file");
  const durationSec = Number(form.get("duration") ?? "0");
  if (!(file instanceof Blob) || file.size === 0) {
    return NextResponse.json({ error: NO_RECORDING }, { status: 422 });
  }

  // Zu kurze Aufnahmen: kein Quota-Verbrauch, kein OpenAI-Aufruf.
  if (shouldRejectRecording(durationSec)) {
    return NextResponse.json({ error: NO_RECORDING }, { status: 422 });
  }

  // Limit erst pruefen, wenn wir wirklich OpenAI aufrufen wuerden.
  let quota;
  try {
    quota = await consumeQuota(supabase);
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Limit-Fehler" },
      { status: 500 }
    );
  }
  if (!quota.allowed) {
    return NextResponse.json(
      { error: `Tageslimit erreicht (${quota.limit}/Tag). Morgen wieder.` },
      { status: 429 }
    );
  }

  const settings = await loadSettings(supabase);
  const override = form.get("workflow");
  const workflow =
    typeof override === "string" && WORKFLOWS.includes(override as WorkflowType)
      ? (override as WorkflowType)
      : settings.workflow;

  const langOverride = form.get("language");
  const language =
    typeof langOverride === "string" && langOverride.trim() !== ""
      ? langOverride.trim()
      : settings.language;

  const modelOverride = form.get("model");
  const model: TranscriptionModel =
    typeof modelOverride === "string" &&
    TRANSCRIPTION_MODELS.includes(modelOverride as TranscriptionModel)
      ? (modelOverride as TranscriptionModel)
      : DEFAULT_TRANSCRIPTION_MODEL;

  const fileName = (file as File).name || "audio.webm";
  const vocabularyHints = durationSec >= 0.9 ? settings.customTerms : [];

  try {
    const raw = cleaned(
      await transcribe(file, fileName, language, vocabularyHints, model)
    );
    if (isLikelyArtifact(raw, durationSec)) {
      return NextResponse.json({ error: NO_RECORDING }, { status: 422 });
    }

    const result = cleaned(await applyWorkflow(workflow, raw, settings));
    return NextResponse.json({ text: result, workflow });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Unbekannter Fehler" },
      { status: 502 }
    );
  }
}
