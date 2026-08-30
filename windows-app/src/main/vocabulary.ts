// Harte Nachkorrektur fuer benutzerdefinierte Eigennamen/Fachbegriffe.
// Whisper's "prompt"-Parameter (siehe openai.ts) ist nur ein weicher Hinweis
// und keine Garantie. Hier wird per Levenshtein-Distanz nachkorrigiert,
// falls Whisper einen Begriff leicht falsch geschrieben hat.

interface Token {
  text: string;
  start: number;
  end: number;
}

function tokenize(text: string): Token[] {
  const tokens: Token[] = [];
  const re = /[\p{L}\p{N}]+/gu;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text)) !== null) {
    tokens.push({ text: m[0], start: m.index, end: m.index + m[0].length });
  }
  return tokens;
}

function levenshtein(a: string, b: string): number {
  const al = a.length;
  const bl = b.length;
  if (al === 0) return bl;
  if (bl === 0) return al;
  const dp = new Array(bl + 1);
  for (let j = 0; j <= bl; j++) dp[j] = j;
  for (let i = 1; i <= al; i++) {
    let prev = dp[0];
    dp[0] = i;
    for (let j = 1; j <= bl; j++) {
      const tmp = dp[j];
      dp[j] = a[i - 1] === b[j - 1] ? prev : 1 + Math.min(prev, dp[j], dp[j - 1]);
      prev = tmp;
    }
  }
  return dp[bl];
}

/** Erlaubte Distanz je Wortlaenge — grosszuegiger bei laengeren Woertern. */
function maxDistanceFor(len: number): number {
  if (len <= 4) return 1;
  if (len <= 9) return 2;
  return 3;
}

function wordsMatch(a: string, b: string): boolean {
  const al = a.toLowerCase();
  const bl = b.toLowerCase();
  if (al === bl) return true;
  if (al.length < 3 || bl.length < 3) return false;
  if (al[0] !== bl[0]) return false; // Anfangsbuchstabe muss stimmen (weniger Fehltreffer)
  return levenshtein(al, bl) <= maxDistanceFor(Math.max(al.length, bl.length));
}

/**
 * Ersetzt Woerter/Wortfolgen im Text, die einem der customTerms nahe genug
 * sind, durch die exakte, vom Nutzer hinterlegte Schreibweise. Mehrwort-
 * Begriffe (z.B. "Andreas von Foerster") werden als zusammenhaengende
 * Wortfolge geprueft.
 */
export function correctVocabulary(text: string, customTerms: string[]): string {
  const terms = customTerms.map((t) => t.trim()).filter((t) => t !== "");
  if (terms.length === 0 || text.trim() === "") return text;

  const tokens = tokenize(text);
  if (tokens.length === 0) return text;

  // Laengere (mehrwortige) Begriffe zuerst pruefen, damit sie nicht durch
  // Einzelwort-Treffer vorher "zerschnitten" werden.
  terms.sort((a, b) => b.split(/\s+/).length - a.split(/\s+/).length);

  const claimed = new Array(tokens.length).fill(false);
  const replacements: { start: number; end: number; text: string }[] = [];

  for (const term of terms) {
    const words = term.split(/\s+/);
    const n = words.length;

    for (let i = 0; i + n <= tokens.length; i++) {
      if (claimed.slice(i, i + n).some(Boolean)) continue;

      let matches = true;
      for (let j = 0; j < n; j++) {
        if (!wordsMatch(tokens[i + j].text, words[j])) {
          matches = false;
          break;
        }
      }

      if (matches) {
        replacements.push({ start: tokens[i].start, end: tokens[i + n - 1].end, text: term });
        for (let j = 0; j < n; j++) claimed[i + j] = true;
        i += n - 1;
      }
    }
  }

  if (replacements.length === 0) return text;

  replacements.sort((a, b) => a.start - b.start);
  let result = "";
  let cursor = 0;
  for (const r of replacements) {
    result += text.slice(cursor, r.start) + r.text;
    cursor = r.end;
  }
  result += text.slice(cursor);
  return result;
}
