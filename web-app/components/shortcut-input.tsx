"use client";

import { useState, useEffect, useRef } from "react";
import {
  type Shortcut,
  loadShortcut,
  saveShortcut,
  formatShortcut,
  DEFAULT_SHORTCUT,
} from "@/lib/shortcut";

const MODIFIER_KEYS = new Set(["Control", "Alt", "Meta", "Shift"]);

export function ShortcutInput() {
  const [shortcut, setShortcut] = useState<Shortcut>(DEFAULT_SHORTCUT);
  const [listening, setListening] = useState(false);
  const [previewLabel, setPreviewLabel] = useState<string | null>(null);
  const candidateRef = useRef<Shortcut | null>(null);

  useEffect(() => {
    setShortcut(loadShortcut());
  }, []);

  useEffect(() => {
    if (!listening) return;

    function onKeyDown(e: KeyboardEvent) {
      e.preventDefault();
      const candidate: Shortcut = {
        ctrl: e.ctrlKey,
        alt: e.altKey,
        meta: e.metaKey,
        shift: e.shiftKey,
        key: MODIFIER_KEYS.has(e.key) ? null : e.key,
      };
      candidateRef.current = candidate;
      setPreviewLabel(formatShortcut(candidate));
    }

    function onKeyUp(e: KeyboardEvent) {
      e.preventDefault();
      // Commit once all modifiers are released
      if (!e.ctrlKey && !e.altKey && !e.metaKey && !e.shiftKey) {
        const saved = candidateRef.current;
        if (saved) {
          saveShortcut(saved);
          setShortcut(saved);
        }
        setListening(false);
        setPreviewLabel(null);
        candidateRef.current = null;
      }
    }

    function onBlur() {
      setListening(false);
      setPreviewLabel(null);
      candidateRef.current = null;
    }

    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
    window.addEventListener("blur", onBlur);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
      window.removeEventListener("blur", onBlur);
    };
  }, [listening]);

  const label = listening
    ? (previewLabel ?? "Tasten druecken ...")
    : formatShortcut(shortcut);

  return (
    <div>
      <p className="text-xs font-medium text-muted">Aufnahme-Shortcut (halten)</p>
      <button
        type="button"
        onClick={() => setListening(true)}
        onKeyDown={(e) => e.preventDefault()}
        className={[
          "mt-1 w-full rounded-lg border px-3 py-2.5 text-left text-base outline-none transition-colors",
          listening
            ? "border-accent bg-accent/10 text-accent"
            : "border-border bg-card text-foreground hover:border-accent/60",
        ].join(" ")}
      >
        {label}
      </button>
      {listening && (
        <p className="mt-1 text-xs text-muted">
          Gewuenschte Tasten halten, dann loslassen zum Speichern. Klick ausserhalb bricht ab.
        </p>
      )}
    </div>
  );
}
