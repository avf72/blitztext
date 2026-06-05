"use server";

import { revalidatePath } from "next/cache";
import { saveSettings } from "@/lib/settings-service";
import type { EmojiDensity, Tone, WorkflowType } from "@/lib/types";

export interface SettingsState {
  message?: string;
  error?: string;
}

export async function saveSettingsAction(
  _prev: SettingsState,
  formData: FormData
): Promise<SettingsState> {
  try {
    await saveSettings({
      workflow: String(formData.get("workflow")) as WorkflowType,
      language: String(formData.get("language") ?? "de").trim() || "de",
      tone: String(formData.get("tone")) as Tone,
      emojiDensity: String(formData.get("emojiDensity")) as EmojiDensity,
      customTerms: String(formData.get("customTerms") ?? "")
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean),
      context: String(formData.get("context") ?? "").trim(),
    });
    revalidatePath("/");
    return { message: "Gespeichert." };
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Speichern fehlgeschlagen." };
  }
}
