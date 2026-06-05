"use client";

import type { Status } from "./status-pill";

// Grosser Tap-Button. Ersetzt den Desktop-Hotkey.
export function RecordButton({
  status,
  onToggle,
}: {
  status: Status;
  onToggle: () => void;
}) {
  const recording = status === "recording";
  const busy = status === "processing";

  return (
    <button
      onClick={onToggle}
      disabled={busy}
      aria-label={recording ? "Aufnahme stoppen" : "Aufnahme starten"}
      className={`flex h-40 w-40 items-center justify-center rounded-full transition-transform active:scale-95 disabled:opacity-60 ${
        recording
          ? "bg-red-500 shadow-[0_0_0_12px_rgba(239,68,68,0.15)]"
          : "bg-accent shadow-[0_0_0_12px_rgba(59,130,246,0.12)]"
      }`}
    >
      <MicIcon active={recording} />
    </button>
  );
}

function MicIcon({ active }: { active: boolean }) {
  return (
    <svg
      width="56"
      height="56"
      viewBox="0 0 24 24"
      fill="none"
      stroke="white"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={active ? "animate-pulse" : ""}
    >
      <rect x="9" y="2" width="6" height="12" rx="3" />
      <path d="M5 10a7 7 0 0 0 14 0" />
      <line x1="12" y1="17" x2="12" y2="22" />
    </svg>
  );
}
