// In-App-Update: prueft Version, laedt den Installer, startet ihn.
import { app, shell } from "electron";
import { writeFileSync } from "node:fs";
import { join } from "node:path";
import { WIN_VERSION_URL, WIN_SETUP_URL } from "./constants";

export type CheckResult =
  | { status: "uptodate" }
  | { status: "available"; remote: number }
  | { status: "error" };

/** Lokale Build-Nummer aus der Version (0.1.<n>). */
function localVersionNum(): number {
  return parseInt(app.getVersion().split(".")[2] ?? "0", 10) || 0;
}

function fetchWithTimeout(url: string, ms: number): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), ms);
  return fetch(url, { signal: controller.signal }).finally(() => clearTimeout(timer));
}

export async function checkUpdate(): Promise<CheckResult> {
  try {
    const res = await fetchWithTimeout(WIN_VERSION_URL, 10_000);
    if (!res.ok) return { status: "error" };
    const text = await res.text();
    const remote = parseInt(text.trim(), 10);
    if (!Number.isFinite(remote) || isNaN(remote)) return { status: "error" };
    return remote > localVersionNum() ? { status: "available", remote } : { status: "uptodate" };
  } catch {
    return { status: "error" };
  }
}

export async function downloadAndRunInstaller(): Promise<{ ok: boolean; error?: string }> {
  try {
    const res = await fetch(WIN_SETUP_URL, { signal: AbortSignal.timeout(120_000) });
    if (!res.ok) return { ok: false, error: "Download fehlgeschlagen" };
    const buf = Buffer.from(await res.arrayBuffer());
    const file = join(app.getPath("temp"), "Blitztext-Setup.exe");
    writeFileSync(file, buf);
    await shell.openPath(file);
    // Kurz warten, dann beenden, damit der Installer drueber-installieren kann.
    setTimeout(() => app.quit(), 1500);
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Fehler" };
  }
}
