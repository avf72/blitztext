// Liefert einen authentifizierten Supabase-Client je nach Anfrage:
// - Authorization: Bearer <jwt>  -> Token-Client (native App)
// - sonst                        -> Cookie-Client (Web-App)
// Beide Clients teilen dieselbe Query-API (.auth/.from/.rpc), RLS + auth.uid() greifen.
import "server-only";
import { createClient as createTokenClient } from "@supabase/supabase-js";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createClient as createCookieClient } from "./server";

export async function getSupabaseForRequest(
  request: Request
): Promise<SupabaseClient> {
  const auth = request.headers.get("authorization");
  if (auth?.startsWith("Bearer ")) {
    const token = auth.slice(7);
    return createTokenClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        global: { headers: { Authorization: `Bearer ${token}` } },
        auth: { persistSession: false, autoRefreshToken: false },
      }
    );
  }
  return createCookieClient();
}
