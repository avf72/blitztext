# Blitztext Web

Mobile-first PWA-Version von Blitztext. Sprache rein, Text raus — im Browser, auch
unterwegs auf dem Smartphone. Mehrbenutzer mit Login.

Portiert aus `../windows-app` (Logik) und `../BlitztextMac` (Prompts).

## Stack
Next.js 15 (App Router) · TypeScript · Tailwind v4 · Supabase (Auth + Postgres + RLS) ·
Vercel · PWA.

## Architektur
- **Diktat-Flow:** Browser nimmt Audio auf (`lib/audio.ts`, MediaRecorder mit Mime-Erkennung
  fuer iOS) -> `POST /api/dictate` -> Server prueft Auth + Tageslimit, ruft Whisper und den
  gewaehlten Workflow auf -> Text zurueck -> Kopieren / Teilen (`components/result-card.tsx`).
- **OpenAI-Key** liegt ausschliesslich Server-seitig (`OPENAI_API_KEY`). Nichts Sensibles
  erreicht den Browser.
- **Auth:** Supabase. Geschuetzte Routen via `middleware.ts`.
- **Einstellungen** pro Nutzer in `user_settings` (RLS), folgen ueber Geraete.
- **Rate-Limit:** `blitztext_usage_counters` + RPC `blitztext_increment_usage`
  (SECURITY DEFINER, Nutzer aus `auth.uid()` - kein Service-Role-Key noetig), Tageslimit `DAILY_LIMIT`.

## Setup
1. `npm install`
2. Supabase-Projekt anlegen, Migration `supabase/migrations/0001_init.sql` anwenden,
   E-Mail-Auth aktivieren.
3. `.env.local` aus `.env.local.example` befuellen.
4. `npm run dev` -> http://localhost:3000

## Env-Variablen
Siehe `.env.local.example`: `OPENAI_API_KEY`, `NEXT_PUBLIC_SUPABASE_URL`,
`NEXT_PUBLIC_SUPABASE_ANON_KEY`, `DAILY_LIMIT`.

## Deployment (Vercel)
- Root-Verzeichnis des Vercel-Projekts: `web-app`
- Alle Env-Variablen in Vercel hinterlegen
- `GOOGLE`/OAuth-Redirects in Supabase auf die Vercel-URL zeigen lassen (`/auth/callback`)

## Tests
`npm run test:e2e` (Playwright, mobil emuliert). Mikrofon-Aufnahme ist nicht
automatisierbar — auf echtem Geraet via Vercel-Preview testen.

## Bekannte Punkte (Preview)
- PWA-Icon ist SVG. Fuer perfekte iOS-Homescreen-Darstellung spaeter PNGs (192/512) ergaenzen.
- Online-only (keine lokale Transkription wie in der Desktop-App).
