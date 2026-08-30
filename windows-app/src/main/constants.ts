// Zentrale externe Links + Update-Quellen.

export const OPENAI_BILLING =
  "https://platform.openai.com/settings/organization/billing/overview";

// Windows-Release-Assets (von der GitHub-Actions Windows-Build veroeffentlicht).
export const WIN_VERSION_URL =
  "https://github.com/avf72/blitztext/releases/download/windows-latest/windows-version.txt";
export const WIN_SETUP_URL =
  "https://github.com/avf72/blitztext/releases/download/windows-latest/Blitztext-Setup.exe";

// Geteiltes Supabase-Projekt (dasselbe wie web-app/android-app) fuer
// geraeteuebergreifende Einstellungen (Eigennamen, Kontext, Ton, ...).
// Der Anon-Key ist oeffentlich (durch RLS geschuetzt) und bereits in der
// Android-App/Web-App im Klartext enthalten.
export const SUPABASE_URL = "https://cuoxdqokkiadmnoaoxgi.supabase.co";
export const SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImN1b3hkcW9ra2lhZG1ub2FveGdpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM4NDI4MzMsImV4cCI6MjA4OTQxODgzM30.OYr04Gz35jM0QhNpS5dXtxl0UIWjMO9pEIWSoDrk9WE";
export const CLOUD_REDIRECT = "blitztext://auth-callback";
