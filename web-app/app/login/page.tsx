"use client";

import { useActionState, useState } from "react";
import { signIn, signUp, type AuthState } from "./actions";
import { createClient } from "@/lib/supabase/client";

export default function LoginPage() {
  const [mode, setMode] = useState<"login" | "signup">("login");
  const action = mode === "login" ? signIn : signUp;
  const [state, formAction, pending] = useActionState<AuthState, FormData>(
    action,
    {}
  );

  async function googleLogin() {
    const supabase = createClient();
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    });
  }

  return (
    <main className="flex min-h-dvh flex-col items-center justify-center px-6">
      <div className="w-full max-w-sm">
        <h1 className="text-3xl font-semibold tracking-tight">Blitztext</h1>
        <p className="mt-1 text-sm text-muted">Sprache rein. Text raus.</p>

        <button
          onClick={googleLogin}
          className="mt-8 flex w-full items-center justify-center gap-2 rounded-lg border border-border bg-card py-2.5 font-medium"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.27-4.74 3.27-8.1z"/>
            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.65l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84A11 11 0 0 0 12 23z"/>
            <path fill="#FBBC05" d="M5.84 14.1a6.6 6.6 0 0 1 0-4.2V7.06H2.18a11 11 0 0 0 0 9.88l3.66-2.84z"/>
            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84C6.71 7.31 9.14 5.38 12 5.38z"/>
          </svg>
          Mit Google anmelden
        </button>

        <div className="my-5 flex items-center gap-3 text-xs text-muted">
          <span className="h-px flex-1 bg-border" />
          oder mit E-Mail
          <span className="h-px flex-1 bg-border" />
        </div>

        <form action={formAction} className="space-y-4">
          <div>
            <label htmlFor="email" className="text-xs font-medium text-muted">
              E-Mail
            </label>
            <input
              id="email"
              name="email"
              type="email"
              required
              autoComplete="email"
              className="mt-1 w-full rounded-lg border border-border bg-card px-3 py-2.5 text-base outline-none focus:border-accent"
            />
          </div>
          <div>
            <label htmlFor="password" className="text-xs font-medium text-muted">
              Passwort
            </label>
            <input
              id="password"
              name="password"
              type="password"
              required
              autoComplete={mode === "login" ? "current-password" : "new-password"}
              className="mt-1 w-full rounded-lg border border-border bg-card px-3 py-2.5 text-base outline-none focus:border-accent"
            />
          </div>

          {state.error && <p className="text-sm text-red-400">{state.error}</p>}
          {state.message && (
            <p className="text-sm text-green-400">{state.message}</p>
          )}

          <button
            type="submit"
            disabled={pending}
            className="w-full rounded-lg bg-accent py-2.5 font-medium text-white disabled:opacity-50"
          >
            {pending
              ? "Bitte warten ..."
              : mode === "login"
                ? "Einloggen"
                : "Konto erstellen"}
          </button>
        </form>

        <button
          onClick={() => setMode(mode === "login" ? "signup" : "login")}
          className="mt-5 w-full text-center text-sm text-muted"
        >
          {mode === "login"
            ? "Noch kein Konto? Registrieren"
            : "Schon ein Konto? Einloggen"}
        </button>
      </div>
    </main>
  );
}
