// System-Prompts 1:1 portiert aus BlitztextMac/Services/LLMService.swift
// und BlitztextMac/Features/Workflows/WorkflowProtocol.swift

import type { Settings } from "./store";

export type Tone = "formal" | "neutral" | "casual";
export type EmojiDensity = "wenig" | "mittel" | "viel";

/** Lektor-Prompt fuer Blitztext+ (Text verbessern). */
export function buildImprovePrompt(settings: Settings): string {
  let prompt = [
    "Du bist ein Lektor und Schreibassistent. Verbessere den folgenden Text:",
    "- Korrigiere Rechtschreibung und Grammatik",
    "- Verbessere die Formulierung und den Lesefluss",
    "- Behalte die urspruengliche Bedeutung bei",
    "- Gib NUR den verbesserten Text zurueck, keine Erklaerungen",
  ].join("\n");

  switch (settings.tone) {
    case "formal":
      prompt += "\n- Verwende einen formellen, professionellen Ton";
      break;
    case "neutral":
      prompt += "\n- Verwende einen neutralen, klaren Ton";
      break;
    case "casual":
      prompt += "\n- Verwende einen lockeren, natuerlichen Ton";
      break;
  }

  if (settings.customTerms.length > 0) {
    prompt += `\n\nWichtig: Diese Eigennamen und Fachbegriffe muessen exakt so geschrieben werden: ${settings.customTerms.join(", ")}`;
  }

  if (settings.context.trim() !== "") {
    prompt += `\n\nKontext: ${settings.context}`;
  }

  return prompt;
}

/** Dampf-ablassen-Prompt fuer Blitztext $%&! (Default aus DampfAblassenSettings). */
export const DAMPF_ABLASSEN_PROMPT =
  "Du erhaeltst ein emotional gesprochenes Transkript. Erkenne zuerst das eigentliche Ziel, Anliegen und den wahren Frust der Person. Formuliere daraus eine klare, respektvolle und wirksame Nachricht, mit der die Person ihr Ziel eher erreicht. Bewahre relevante Fakten, konkrete Probleme, Grenzen, Erwartungen und die noetige Dringlichkeit. Entferne Beleidigungen, Drohungen, Sarkasmus, Unterstellungen und unnoetige Eskalation. Wenn mehrere Vorwuerfe genannt werden, verdichte sie auf die entscheidenden Kernpunkte. Der Ton soll ruhig, menschlich, bestimmt und loesungsorientiert sein. Gib NUR die fertige Nachricht zurueck.";

/** Emoji-Prompt fuer Blitztext :) */
export function buildEmojiPrompt(density: EmojiDensity): string {
  let densityInstruction: string;
  switch (density) {
    case "wenig":
      densityInstruction = "Setze nur vereinzelt Emojis ein, maximal 1-2 pro Absatz.";
      break;
    case "mittel":
      densityInstruction = "Setze regelmaessig passende Emojis ein, etwa alle 1-2 Saetze.";
      break;
    case "viel":
      densityInstruction = "Setze grosszuegig Emojis ein, gerne mehrere pro Satz.";
      break;
  }
  return `Du erhaeltst ein gesprochenes Transkript. Gib den Text moeglichst originalgetreu zurueck, aber fuege passende Emojis ein. ${densityInstruction} Korrigiere offensichtliche Sprach- und Grammatikfehler. Behalte den Stil und die Bedeutung bei. Gib NUR den Text mit Emojis zurueck, keine Erklaerungen.`;
}
