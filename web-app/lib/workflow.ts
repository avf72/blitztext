// Workflow-Anwendung, portiert aus windows-app/src/main/controller.ts applyWorkflow().
import "server-only";
import { rewrite } from "./openai";
import { buildImprovePrompt, DAMPF_ABLASSEN_PROMPT, buildEmojiPrompt } from "./prompts";
import type { Settings, WorkflowType } from "./types";

/** Wendet den gewaehlten Workflow auf das rohe Transkript an. */
export async function applyWorkflow(
  workflow: WorkflowType,
  raw: string,
  settings: Settings
): Promise<string> {
  switch (workflow) {
    case "transcription":
      return raw;
    case "textImprover":
      return rewrite(raw, buildImprovePrompt(settings), "gpt-4o-mini", 0.3);
    case "dampfAblassen":
      return rewrite(raw, DAMPF_ABLASSEN_PROMPT, "gpt-4o", 0.4);
    case "emojiText":
      return rewrite(raw, buildEmojiPrompt(settings.emojiDensity), "gpt-4o-mini", 0.3);
  }
}
