import Link from "next/link";
import { loadSettings } from "@/lib/settings-service";
import { signOut } from "./login/actions";
import { Dictation } from "@/components/dictation";

export default async function HomePage() {
  const settings = await loadSettings();

  return (
    <main className="flex min-h-dvh flex-col px-6 pb-10 pt-[max(1rem,env(safe-area-inset-top))]">
      <header className="flex items-center justify-between">
        <span className="text-lg font-semibold tracking-tight">Blitztext</span>
        <nav className="flex items-center gap-4 text-sm text-muted">
          <Link href="/settings">Einstellungen</Link>
          <form action={signOut}>
            <button type="submit">Abmelden</button>
          </form>
        </nav>
      </header>

      <div className="flex flex-1 flex-col items-center justify-center">
        <Dictation initialWorkflow={settings.workflow} />
      </div>
    </main>
  );
}
