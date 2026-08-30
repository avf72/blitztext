// Cloud-Login (Supabase, Google OAuth via PKCE) fuer geraeteuebergreifende
// Einstellungen. Analog zu android-app/AuthManager.kt: PKCE-Flow ueber den
// System-Browser, Ergebnis kommt per Custom-Protocol-Callback zurueck.

import { randomBytes, createHash } from "node:crypto";
import { shell } from "electron";
import { SUPABASE_URL, SUPABASE_ANON_KEY, CLOUD_REDIRECT } from "./constants";
import { getCloudTokens, setCloudTokens, clearCloudTokens, type CloudTokens } from "./store";
import { log } from "./log";

let pendingVerifier: string | null = null;

function base64url(buf: Buffer): string {
  return buf.toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function decodeJwtSub(token: string): string | null {
  try {
    const payload = token.split(".")[1];
    const json = Buffer.from(payload.replace(/-/g, "+").replace(/_/g, "/"), "base64").toString(
      "utf-8"
    );
    return (JSON.parse(json) as { sub?: string }).sub ?? null;
  } catch {
    return null;
  }
}

/** Login starten: PKCE-Verifier erzeugen, Authorize-URL im System-Browser oeffnen. */
export function startCloudLogin(): void {
  const verifier = base64url(randomBytes(64));
  pendingVerifier = verifier;
  const challenge = base64url(createHash("sha256").update(verifier).digest());

  const url = new URL(`${SUPABASE_URL}/auth/v1/authorize`);
  url.searchParams.set("provider", "google");
  url.searchParams.set("redirect_to", CLOUD_REDIRECT);
  url.searchParams.set("code_challenge", challenge);
  url.searchParams.set("code_challenge_method", "S256");

  log("Cloud-Login gestartet — oeffne System-Browser");
  void shell.openExternal(url.toString());
}

/** Callback-URL (blitztext://auth-callback?code=...) verarbeiten. */
export async function handleCloudCallback(callbackUrl: string): Promise<boolean> {
  let code: string | null;
  try {
    code = new URL(callbackUrl).searchParams.get("code");
  } catch {
    return false;
  }
  if (!code || !pendingVerifier) {
    log("Cloud-Callback ohne gueltigen Code/Verifier erhalten");
    return false;
  }
  const verifier = pendingVerifier;
  pendingVerifier = null;

  try {
    const res = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=pkce`, {
      method: "POST",
      headers: { apikey: SUPABASE_ANON_KEY, "Content-Type": "application/json" },
      body: JSON.stringify({ auth_code: code, code_verifier: verifier }),
    });
    if (!res.ok) {
      log(`Cloud-Login fehlgeschlagen: Status ${res.status}`);
      return false;
    }
    const data = (await res.json()) as {
      access_token?: string;
      refresh_token?: string;
      expires_in?: number;
    };
    if (!data.access_token) return false;
    const userId = decodeJwtSub(data.access_token);
    if (!userId) return false;

    setCloudTokens({
      accessToken: data.access_token,
      refreshToken: data.refresh_token ?? "",
      expiresAt: Math.floor(Date.now() / 1000) + (data.expires_in ?? 3600),
      userId,
    });
    log("Cloud-Login erfolgreich");
    return true;
  } catch (err) {
    log(`Cloud-Login-Fehler: ${err instanceof Error ? err.message : String(err)}`);
    return false;
  }
}

/** Gueltigen Access-Token liefern, bei Bedarf per Refresh-Token erneuern. */
export async function getValidCloudToken(): Promise<{ token: string; userId: string } | null> {
  const tokens = getCloudTokens();
  if (!tokens) return null;

  const now = Math.floor(Date.now() / 1000);
  if (tokens.expiresAt - now > 60) return { token: tokens.accessToken, userId: tokens.userId };

  try {
    const res = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=refresh_token`, {
      method: "POST",
      headers: { apikey: SUPABASE_ANON_KEY, "Content-Type": "application/json" },
      body: JSON.stringify({ refresh_token: tokens.refreshToken }),
    });
    if (!res.ok) {
      log(`Cloud-Token-Erneuerung fehlgeschlagen: Status ${res.status}`);
      return null;
    }
    const data = (await res.json()) as {
      access_token?: string;
      refresh_token?: string;
      expires_in?: number;
    };
    if (!data.access_token) return null;
    const userId = decodeJwtSub(data.access_token) ?? tokens.userId;

    const next: CloudTokens = {
      accessToken: data.access_token,
      refreshToken: data.refresh_token ?? tokens.refreshToken,
      expiresAt: now + (data.expires_in ?? 3600),
      userId,
    };
    setCloudTokens(next);
    return { token: next.accessToken, userId: next.userId };
  } catch (err) {
    log(`Cloud-Token-Erneuerung-Fehler: ${err instanceof Error ? err.message : String(err)}`);
    return null;
  }
}

export function isCloudLoggedIn(): boolean {
  return getCloudTokens() !== null;
}

export function cloudLogout(): void {
  clearCloudTokens();
  log("Cloud-Logout durchgefuehrt");
}
