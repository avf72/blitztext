"use client";

import { useRef, useState, useEffect, useCallback } from "react";
import { AudioRecorder } from "@/lib/audio";
import { loadShortcut, matchesShortcut } from "@/lib/shortcut";
import { WORKFLOW_LABELS, type WorkflowType } from "@/lib/types";
import { RecordButton } from "./record-button";
import { StatusPill, type Status } from "./status-pill";
import { ResultCard } from "./result-card";

const WORKFLOWS = Object.keys(WORKFLOW_LABELS) as WorkflowType[];

const OPENAI_BILLING =
  "https://platform.openai.com/settings/organization/billing/overview";

function isQuotaError(msg: string): boolean {
  const l = msg.toLowerCase();
  return l.includes("quota") || l.includes("billing") || l.includes("insufficient");
}

export function Dictation({ initialWorkflow }: { initialWorkflow: WorkflowType }) {
  const [status, setStatus] = useState<Status>("idle");
  const [statusText, setStatusText] = useState("Bereit. Tippen und sprechen.");
  const [result, setResult] = useState<string | null>(null);
  const [billing, setBilling] = useState(false);
  const [workflow, setWorkflow] = useState<WorkflowType>(initialWorkflow);
  const recorderRef = useRef<AudioRecorder | null>(null);
  const workflowRef = useRef(workflow);
  workflowRef.current = workflow;

  function set(s: Status, text: string) {
    setStatus(s);
    setStatusText(text);
  }

  const stopAndProcess = useCallback(async () => {
    const recorder = recorderRef.current;
    if (!recorder) return;
    set("processing", "Wird verarbeitet ...");

    try {
      const rec = await recorder.stop();
      recorderRef.current = null;

      const form = new FormData();
      form.append("file", rec.blob, rec.fileName);
      form.append("duration", String(rec.durationSec));
      form.append("workflow", workflowRef.current);

      const res = await fetch("/api/dictate", { method: "POST", body: form });
      const data = (await res.json()) as { text?: string; error?: string };

      if (!res.ok) {
        const msg = data.error ?? "Fehler bei der Verarbeitung.";
        if (isQuotaError(msg)) {
          setBilling(true);
          set("error", "Kein OpenAI-Guthaben.");
        } else {
          set("error", msg);
        }
        return;
      }
      setResult(data.text ?? "");
      set("done", "Fertig.");
    } catch {
      set("error", "Verarbeitung fehlgeschlagen.");
    }
  }, []);

  const startRecording = useCallback(async (label = "Aufnahme laeuft. Nochmal tippen zum Stoppen.") => {
    setResult(null);
    setBilling(false);
    const recorder = new AudioRecorder();
    try {
      await recorder.start();
      recorderRef.current = recorder;
      set("recording", label);
    } catch {
      set("error", "Mikrofon nicht verfuegbar oder abgelehnt.");
    }
  }, []);

  async function toggle() {
    if (status === "recording") return stopAndProcess();
    if (status === "processing") return;
    await startRecording();
  }

  // Konfigurierbarer Shortcut (halten → aufnehmen, loslassen → verarbeiten)
  useEffect(() => {
    let active = false;

    function onKeyDown(e: KeyboardEvent) {
      if (active || recorderRef.current !== null) return;
      const shortcut = loadShortcut();
      if (matchesShortcut(shortcut, e)) {
        active = true;
        startRecording("Aufnahme laeuft. Tasten loslassen zum Stoppen.");
      }
    }

    function onKeyUp(e: KeyboardEvent) {
      if (!active) return;
      const shortcut = loadShortcut();
      // Stop when any required modifier is released
      const modReleased =
        (shortcut.ctrl && !e.ctrlKey) ||
        (shortcut.alt && !e.altKey) ||
        (shortcut.meta && !e.metaKey) ||
        (shortcut.shift && !e.shiftKey) ||
        (shortcut.key !== null && e.key === shortcut.key);
      if (modReleased && recorderRef.current) {
        active = false;
        stopAndProcess();
      }
    }

    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
    };
  }, [startRecording, stopAndProcess]);

  return (
    <div className="flex w-full max-w-md flex-1 flex-col items-center gap-8">
      <select
        value={workflow}
        onChange={(e) => setWorkflow(e.target.value as WorkflowType)}
        disabled={status === "recording" || status === "processing"}
        className="w-full rounded-lg border border-border bg-card px-3 py-2.5 text-sm outline-none focus:border-accent"
      >
        {WORKFLOWS.map((w) => (
          <option key={w} value={w}>
            {WORKFLOW_LABELS[w]}
          </option>
        ))}
      </select>

      <div className="flex flex-col items-center gap-5 pt-4">
        <RecordButton status={status} onToggle={toggle} />
        <StatusPill status={status} text={statusText} />
      </div>

      {billing && (
        <a
          href={OPENAI_BILLING}
          target="_blank"
          rel="noopener noreferrer"
          className="rounded-lg bg-accent px-5 py-2.5 text-sm font-medium text-white"
        >
          OpenAI-Guthaben laden →
        </a>
      )}

      {result !== null && result !== "" && <ResultCard text={result} />}
    </div>
  );
}
