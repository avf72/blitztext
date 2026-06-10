// Kopiert die Renderer-HTML-Dateien nach dist/ (tsc kopiert nur TS).
import { cpSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const srcRenderer = join(root, "src", "renderer");
const dstRenderer = join(root, "dist", "renderer");
const pkg = JSON.parse(readFileSync(join(root, "package.json"), "utf-8"));

mkdirSync(dstRenderer, { recursive: true });
cpSync(srcRenderer, dstRenderer, { recursive: true });

const settingsFile = join(dstRenderer, "settings.html");
const settings = readFileSync(settingsFile, "utf-8").replaceAll("__APP_VERSION__", pkg.version);
writeFileSync(settingsFile, settings, "utf-8");

console.log("Assets kopiert: src/renderer -> dist/renderer");
