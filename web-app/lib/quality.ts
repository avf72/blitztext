// Qualitaetsfilter, 1:1 portiert aus windows-app/src/main/quality.ts

const MIN_DURATION = 0.3;

export function shouldRejectRecording(durationSec: number): boolean {
  return durationSec < MIN_DURATION;
}

export function cleaned(text: string): string {
  return replaceSharpS(text.trim());
}

/** Ersetzt ß durch ss (Schweizer Rechtschreibung), unabhaengig vom Workflow. */
function replaceSharpS(text: string): string {
  return text.replace(/ß/g, "ss").replace(/ẞ/g, "SS");
}

/** Erkennt Whisper-Artefakte bei sehr kurzen Aufnahmen. */
export function isLikelyArtifact(text: string, durationSec: number): boolean {
  const c = cleaned(text);
  if (c === "") return true;

  const words = c.split(/\s+/).filter(Boolean);
  const letters = (c.match(/\p{L}/gu) ?? []).length;
  if (letters === 0) return true;

  if (durationSec < 0.55 && (words.length >= 5 || c.length >= 32)) return true;
  if (durationSec < 0.8 && c.length >= 56) return true;

  return false;
}
