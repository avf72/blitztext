// Sync der geteilten Einstellungen (Eigennamen, Kontext, Ton, Sprache, Modus)
// mit derselben Supabase-Tabelle, die web-app und android-app nutzen
// (blitztext_user_settings). Hotkey/Transkriptions-Modell bleiben lokal —
// die sind Windows-spezifisch.

import { SUPABASE_URL, SUPABASE_ANON_KEY } from "./constants";
import { getValidCloudToken } from "./cloudAuth";
import { log } from "./log";
import type { Settings } from "./store";

export type SyncedFields = Pick<
  Settings,
  "workflow" | "language" | "tone" | "emojiDensity" | "customTerms" | "context"
>;

interface Row {
  workflow: string;
  language: string;
  tone: string;
  emoji_density: string;
  custom_terms: string[];
  context: string;
}

function rowToSettings(row: Row): SyncedFields {
  return {
    workflow: row.workflow as Settings["workflow"],
    language: row.language,
    tone: row.tone as Settings["tone"],
    emojiDensity: row.emoji_density as Settings["emojiDensity"],
    customTerms: row.custom_terms ?? [],
    context: row.context ?? "",
  };
}

/** Cloud-Einstellungen laden (null falls nicht eingeloggt oder keine Zeile vorhanden). */
export async function pullCloudSettings(): Promise<SyncedFields | null> {
  const auth = await getValidCloudToken();
  if (!auth) return null;

  try {
    const url = `${SUPABASE_URL}/rest/v1/blitztext_user_settings?select=workflow,language,tone,emoji_density,custom_terms,context`;
    const res = await fetch(url, {
      headers: { apikey: SUPABASE_ANON_KEY, Authorization: `Bearer ${auth.token}` },
    });
    if (!res.ok) {
      log(`Cloud-Einstellungen laden fehlgeschlagen: Status ${res.status}`);
      return null;
    }
    const rows = (await res.json()) as Row[];
    return rows[0] ? rowToSettings(rows[0]) : null;
  } catch (err) {
    log(`Cloud-Einstellungen-Fehler: ${err instanceof Error ? err.message : String(err)}`);
    return null;
  }
}

/** Lokale Einstellungen in die Cloud schreiben (Upsert auf die eigene Zeile). */
export async function pushCloudSettings(settings: SyncedFields): Promise<boolean> {
  const auth = await getValidCloudToken();
  if (!auth) return false;

  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/blitztext_user_settings`, {
      method: "POST",
      headers: {
        apikey: SUPABASE_ANON_KEY,
        Authorization: `Bearer ${auth.token}`,
        "Content-Type": "application/json",
        Prefer: "resolution=merge-duplicates,return=minimal",
      },
      body: JSON.stringify({
        user_id: auth.userId,
        workflow: settings.workflow,
        language: settings.language,
        tone: settings.tone,
        emoji_density: settings.emojiDensity,
        custom_terms: settings.customTerms,
        context: settings.context,
        updated_at: new Date().toISOString(),
      }),
    });
    if (!res.ok) {
      log(`Cloud-Einstellungen speichern fehlgeschlagen: Status ${res.status}`);
    }
    return res.ok;
  } catch (err) {
    log(`Cloud-Einstellungen-Speicherfehler: ${err instanceof Error ? err.message : String(err)}`);
    return false;
  }
}
