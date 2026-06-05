export interface Shortcut {
  ctrl: boolean;
  alt: boolean;
  meta: boolean;
  shift: boolean;
  key: string | null; // null = modifier-only combo
}

export const DEFAULT_SHORTCUT: Shortcut = {
  ctrl: true,
  alt: false,
  meta: true,
  shift: false,
  key: null,
};

const STORAGE_KEY = "blitztext_shortcut";

export function loadShortcut(): Shortcut {
  if (typeof window === "undefined") return DEFAULT_SHORTCUT;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_SHORTCUT;
    return JSON.parse(raw) as Shortcut;
  } catch {
    return DEFAULT_SHORTCUT;
  }
}

export function saveShortcut(s: Shortcut): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(s));
}

const KEY_LABELS: Record<string, string> = {
  Control: "Strg",
  Alt: "Alt",
  Meta: "Win",
  Shift: "Shift",
  " ": "Leertaste",
};

export function formatShortcut(s: Shortcut): string {
  const parts: string[] = [];
  if (s.ctrl) parts.push("Strg");
  if (s.alt) parts.push("Alt");
  if (s.shift) parts.push("Shift");
  if (s.meta) parts.push("Win");
  if (s.key) parts.push(KEY_LABELS[s.key] ?? s.key.toUpperCase());
  return parts.join(" + ") || "—";
}

export function matchesShortcut(s: Shortcut, e: KeyboardEvent): boolean {
  if (s.ctrl !== e.ctrlKey) return false;
  if (s.alt !== e.altKey) return false;
  if (s.meta !== e.metaKey) return false;
  if (s.shift !== e.shiftKey) return false;
  if (s.key && e.key !== s.key) return false;
  return true;
}
