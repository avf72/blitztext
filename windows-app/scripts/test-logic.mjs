// Schnelltest der reinen Logik-Module (kein Electron noetig).
import assert from "node:assert";
import * as quality from "../dist/main/quality.js";
import * as prompts from "../dist/main/prompts.js";
import * as store from "../dist/main/store.js";

let passed = 0;
const ok = (name, fn) => {
  fn();
  passed++;
  console.log("  ok -", name);
};

console.log("quality.ts:");
ok("leerer Text ist Artefakt", () =>
  assert.strictEqual(quality.isLikelyArtifact("", 2), true)
);
ok("normaler Satz ist kein Artefakt", () =>
  assert.strictEqual(quality.isLikelyArtifact("Hallo das ist ein Test", 2), false)
);
ok("langer Text bei sehr kurzer Aufnahme = Artefakt", () =>
  assert.strictEqual(
    quality.isLikelyArtifact("Untertitel der Amara.org Community danke", 0.4),
    true
  )
);
ok("nur Satzzeichen = Artefakt", () =>
  assert.strictEqual(quality.isLikelyArtifact("...", 2), true)
);
ok("zu kurze Aufnahme wird abgelehnt", () =>
  assert.strictEqual(quality.shouldRejectRecording(0.2), true)
);
ok("ausreichend lange Aufnahme ok", () =>
  assert.strictEqual(quality.shouldRejectRecording(0.5), false)
);
ok("cleaned trimmt", () =>
  assert.strictEqual(quality.cleaned("  hi \n"), "hi")
);

console.log("prompts.ts:");
const base = {
  workflow: "textImprover",
  hotkey: "",
  language: "de",
  tone: "formal",
  emojiDensity: "mittel",
  customTerms: ["Infomaniak", "Vercel"],
  context: "geschaeftliche Mails",
};
ok("improve-Prompt enthaelt formellen Ton", () =>
  assert.ok(prompts.buildImprovePrompt(base).includes("formellen"))
);
ok("improve-Prompt enthaelt Fachbegriffe", () =>
  assert.ok(prompts.buildImprovePrompt(base).includes("Infomaniak, Vercel"))
);
ok("improve-Prompt enthaelt Kontext", () =>
  assert.ok(prompts.buildImprovePrompt(base).includes("geschaeftliche Mails"))
);
ok("emoji-Prompt mittel", () =>
  assert.ok(prompts.buildEmojiPrompt("mittel").includes("regelmaessig"))
);
ok("dampf-Prompt vorhanden", () =>
  assert.ok(prompts.DAMPF_ABLASSEN_PROMPT.includes("ruhig"))
);

console.log("store.ts:");
ok("deutscher Hotkey wird normalisiert", () =>
  assert.strictEqual(
    store.normalizeHotkey("Strg + Shift + Leertaste"),
    "CommandOrControl+Shift+Space"
  )
);
ok("leerer Hotkey faellt auf Standard zurueck", () =>
  assert.strictEqual(store.normalizeHotkey(""), "F10")
);
ok("Strg+Win wird normalisiert", () =>
  assert.strictEqual(store.normalizeHotkey("Strg + Win"), "CommandOrControl+Super")
);
ok("alter F9-Hotkey bleibt beim Normalisieren unveraendert", () =>
  assert.strictEqual(store.normalizeHotkey("F9"), "F9")
);

console.log(`\n${passed} Tests bestanden.`);
