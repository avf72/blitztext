import { appendFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { app } from "electron";

export function log(msg: string): void {
  const line = `[${new Date().toISOString()}] ${msg}\n`;
  process.stdout.write(line);
  const fallbackDir = join(tmpdir(), "blitztext-windows");
  try {
    const userData = app.getPath("userData");
    mkdirSync(userData, { recursive: true });
    appendFileSync(join(userData, "blitztext.log"), line, "utf-8");
  } catch (err) {
    try {
      mkdirSync(fallbackDir, { recursive: true });
      appendFileSync(join(fallbackDir, "blitztext.log"), line, "utf-8");
      appendFileSync(
        join(fallbackDir, "blitztext.log"),
        `[${new Date().toISOString()}] Log-Fallback aktiv: ${err instanceof Error ? err.message : String(err)}\n`,
        "utf-8",
      );
    } catch {
      // Dateizugriff schlug fehl — ignorieren
    }
  }
}
