// Tageslimit pro Nutzer. Die RPC laeuft als SECURITY DEFINER und leitet den
// Nutzer aus auth.uid() ab - kein Service-Role-Key noetig, kein Spoofing moeglich.
import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createClient } from "./supabase/server";

const DAILY_LIMIT = Number(process.env.DAILY_LIMIT ?? "50");

export interface LimitResult {
  allowed: boolean;
  used: number;
  limit: number;
}

/**
 * Zaehlt eine Nutzung und prueft das Limit atomar.
 * allowed=false, wenn das Limit bereits erreicht war.
 */
export async function consumeQuota(
  client?: SupabaseClient
): Promise<LimitResult> {
  const supabase = client ?? (await createClient());
  const { data, error } = await supabase.rpc("blitztext_increment_usage", {
    p_limit: DAILY_LIMIT,
  });

  if (error) throw new Error(`Rate-Limit-Fehler: ${error.message}`);

  const row = (data as { allowed: boolean; used: number }[] | null)?.[0];
  return {
    allowed: row?.allowed ?? false,
    used: row?.used ?? 0,
    limit: DAILY_LIMIT,
  };
}
