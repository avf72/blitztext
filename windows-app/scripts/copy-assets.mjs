// Kopiert die Renderer-HTML-Dateien nach dist/ (tsc kopiert nur TS).
import { cpSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const srcRenderer = join(root, "src", "renderer");
const dstRenderer = join(root, "dist", "renderer");

mkdirSync(dstRenderer, { recursive: true });
cpSync(srcRenderer, dstRenderer, { recursive: true });

console.log("Assets kopiert: src/renderer -> dist/renderer");
