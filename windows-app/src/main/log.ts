import { appendFileSync } from "node:fs";
import { join } from "node:path";
import { app } from "electron";

export function log(msg: string): void {
  const line = `[${new Date().toISOString()}] ${msg}\n`;
  process.stdout.write(line);
  try {
    appendFileSync(join(app.getPath("userData"), "blitztext.log"), line, "utf-8");
  } catch {
    // Dateizugriff schlug fehl — ignorieren
  }
}
