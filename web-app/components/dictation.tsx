"use client";

import { useRef, useState } from "react";
import { AudioRecorder } from "@/lib/audio";
import { WORKFLOW_LABELS, type WorkflowType } from "@/lib/types";
import { RecordButton } from "./record-button";
import { StatusPill, type Status } from "./status-pill";
import { ResultCard } from "./result-card";

const WORKFLOWS = Object.keys(WORKFLOW_LABELS) as WorkflowType[];

export function Dictation({ initialWorkflow }: { initialWorkflow: WorkflowType }) {
  const [status, setStatus] = useState<Status>("idle");
  const [statusText, setStatusText] = useState("Bereit. Tippen und sprechen.");
  const [result, setResult] = useState<string | null>(null);
  const [workflow, setWorkflow] = useState<WorkflowType>(initialWorkflow);
  const recorderRef = useRef<AudioRecorder | null>(null);

  function set(s: Status, text: string) {
    setStatus(s);
    setStatusText(text);
  }

  async function toggle() {
    if (status === "recording") return stopAndProcess();
    if (status === "processing") return;

    setResult(null);
    const recorder = new AudioRecorder();
    try {
      await recorder.start();
      recorderRef.current = recorder;
      set("recording", "Aufnahme laeuft. Nochmal tippen zum Stoppen.");
    } catch {
      set("error", "Mikrofon nicht verfuegbar oder abgelehnt.");
    }
  }

  async function stopAndProcess() {
    const recorder = recorderRef.current;
    if (!recorder) return;
    set("processing", "Wird verarbeitet ...");

    try {
      const rec = await recorder.stop();
      recorderRef.current = null;

      const form = new FormData();
      form.append("file", rec.blob, rec.fileName);
      form.append("duration", String(rec.durationSec));
      form.append("workflow", workflow);

      const res = await fetch("/api/dictate", { method: "POST", body: form });
      const data = (await res.json()) as { text?: string; error?: string };

      if (!res.ok) {
        set("error", data.error ?? "Fehler bei der Verarbeitung.");
        return;
      }
      setResult(data.text ?? "");
      set("done", "Fertig.");
    } catch {
      set("error", "Verarbeitung fehlgeschlagen.");
    }
  }

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

      {result !== null && result !== "" && <ResultCard text={result} />}
    </div>
  );
}
