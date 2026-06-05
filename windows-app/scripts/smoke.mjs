// Startet Electron mit gesetztem BLITZTEXT_SMOKE (plattformunabhaengig).
// Aufruf: node scripts/smoke.mjs [boot|mic]
import { spawn } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const mode = process.argv[2] === "mic" ? "mic" : "1";
const electron = join(
  root,
  "node_modules",
  ".bin",
  process.platform === "win32" ? "electron.cmd" : "electron"
);

const child = spawn(electron, ["."], {
  cwd: root,
  stdio: "inherit",
  env: { ...process.env, BLITZTEXT_SMOKE: mode },
  shell: process.platform === "win32",
});

child.on("exit", (code) => process.exit(code ?? 1));
