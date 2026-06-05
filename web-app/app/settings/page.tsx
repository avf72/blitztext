import Link from "next/link";
import { loadSettings } from "@/lib/settings-service";
import { SettingsForm } from "@/components/settings-form";

export default async function SettingsPage() {
  const settings = await loadSettings();

  return (
    <main className="mx-auto min-h-dvh w-full max-w-md px-6 pb-10 pt-[max(1rem,env(safe-area-inset-top))]">
      <header className="flex items-center justify-between">
        <h1 className="text-lg font-semibold tracking-tight">Einstellungen</h1>
        <Link href="/" className="text-sm text-muted">
          Zurueck
        </Link>
      </header>

      <p className="mt-1 mb-6 text-sm text-muted">
        Diese Einstellungen folgen dir auf allen Geraeten.
      </p>

      <SettingsForm initial={settings} />
    </main>
  );
}
