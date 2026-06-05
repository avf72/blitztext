// Tray-Icon mit Workflow-Auswahl und Einstellungen.

import { app, Menu, Tray, nativeImage, shell } from "electron";
import { join } from "node:path";
import { getSettings, saveSettings, type WorkflowType } from "./store";
import { openSettings } from "./windows";
import { OPENAI_BILLING } from "./constants";

let tray: Tray | null = null;

const WORKFLOWS: { type: WorkflowType; label: string; sub: string }[] = [
  { type: "transcription", label: "Blitztext", sub: "Sprache rein. Text raus." },
  { type: "textImprover", label: "Blitztext+", sub: "Geschrieben sprechen." },
  { type: "dampfAblassen", label: "Blitztext $%&!", sub: "Frust rein. Entspannt raus." },
  { type: "emojiText", label: "Blitztext :)", sub: "Text rein. Emojis dazu." },
];

export function createTray(): void {
  const icon = nativeImage.createFromPath(join(__dirname, "../../assets/tray.png"));
  tray = new Tray(icon.isEmpty() ? nativeImage.createEmpty() : icon);
  tray.setToolTip("Blitztext");
  rebuildMenu();
  tray.on("click", () => tray?.popUpContextMenu());
}

export function rebuildMenu(): void {
  if (!tray) return;
  const { workflow, hotkey } = getSettings();

  const menu = Menu.buildFromTemplate([
    { label: `Hotkey: ${hotkey}`, enabled: false },
    { type: "separator" },
    ...WORKFLOWS.map((w) => ({
      label: `${w.label}  —  ${w.sub}`,
      type: "radio" as const,
      checked: workflow === w.type,
      click: () => {
        saveSettings({ workflow: w.type });
        rebuildMenu();
      },
    })),
    { type: "separator" },
    { label: "OpenAI-Guthaben laden ...", click: () => void shell.openExternal(OPENAI_BILLING) },
    { label: "Einstellungen ...", click: () => openSettings() },
    { label: "Beenden", click: () => app.quit() },
  ]);

  tray.setContextMenu(menu);
}
