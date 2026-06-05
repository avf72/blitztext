"use client";

import { useState } from "react";

// Ersetzt das Desktop-"Einfuegen": auf Mobil Kopieren + natives Teilen-Sheet.
export function ResultCard({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  const canShare = typeof navigator !== "undefined" && !!navigator.share;

  async function copy() {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // Clipboard nicht verfuegbar - Text ist weiterhin markierbar.
    }
  }

  async function share() {
    try {
      await navigator.share({ text });
    } catch {
      // Nutzer hat abgebrochen oder Share nicht verfuegbar.
    }
  }

  return (
    <div className="w-full space-y-3">
      <div className="min-h-32 whitespace-pre-wrap rounded-xl border border-border bg-card p-4 text-base leading-relaxed select-text">
        {text}
      </div>
      <div className="flex gap-3">
        <button
          onClick={copy}
          className="flex-1 rounded-lg bg-accent py-2.5 font-medium text-white"
        >
          {copied ? "Kopiert" : "Kopieren"}
        </button>
        {canShare && (
          <button
            onClick={share}
            className="flex-1 rounded-lg border border-border py-2.5 font-medium"
          >
            Teilen
          </button>
        )}
      </div>
    </div>
  );
}
