// Laedt/speichert Pro-Nutzer-Einstellungen aus Supabase (RLS-geschuetzt).
import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createClient } from "./supabase/server";
import { DEFAULT_SETTINGS, type Settings } from "./types";

interface Row {
  workflow: string;
  language: string;
  tone: string;
  emoji_density: string;
  custom_terms: string[];
  context: string;
}

function rowToSettings(row: Row): Settings {
  return {
    workflow: row.workflow as Settings["workflow"],
    language: row.language,
    tone: row.tone as Settings["tone"],
    emojiDensity: row.emoji_density as Settings["emojiDensity"],
    customTerms: row.custom_terms ?? [],
    context: row.context ?? "",
  };
}

/** Einstellungen des eingeloggten Nutzers, Defaults falls keine Zeile existiert.
 *  Optionaler Client: Cookie (Web) oder Bearer-Token (native App). */
export async function loadSettings(
  client?: SupabaseClient
): Promise<Settings> {
  const supabase = client ?? (await createClient());
  const { data } = await supabase
    .from("blitztext_user_settings")
    .select("workflow, language, tone, emoji_density, custom_terms, context")
    .maybeSingle();
  return data ? rowToSettings(data as Row) : { ...DEFAULT_SETTINGS };
}

/** Einstellungen speichern (Upsert auf eigene Zeile). */
export async function saveSettings(s: Settings): Promise<void> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Nicht eingeloggt");

  const { error } = await supabase.from("blitztext_user_settings").upsert({
    user_id: user.id,
    workflow: s.workflow,
    language: s.language,
    tone: s.tone,
    emoji_density: s.emojiDensity,
    custom_terms: s.customTerms,
    context: s.context,
    updated_at: new Date().toISOString(),
  });
  if (error) throw new Error(error.message);
}
