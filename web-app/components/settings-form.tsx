"use client";

import { useActionState } from "react";
import { saveSettingsAction, type SettingsState } from "@/app/settings/actions";
import { WORKFLOW_LABELS, type Settings, type WorkflowType } from "@/lib/types";

const WORKFLOWS = Object.keys(WORKFLOW_LABELS) as WorkflowType[];
const fieldCls =
  "mt-1 w-full rounded-lg border border-border bg-card px-3 py-2.5 text-base outline-none focus:border-accent";
const labelCls = "text-xs font-medium text-muted";

export function SettingsForm({ initial }: { initial: Settings }) {
  const [state, action, pending] = useActionState<SettingsState, FormData>(
    saveSettingsAction,
    {}
  );

  return (
    <form action={action} className="space-y-4">
      <div>
        <label htmlFor="workflow" className={labelCls}>Modus</label>
        <select id="workflow" name="workflow" defaultValue={initial.workflow} className={fieldCls}>
          {WORKFLOWS.map((w) => (
            <option key={w} value={w}>{WORKFLOW_LABELS[w]}</option>
          ))}
        </select>
      </div>

      <div>
        <label htmlFor="language" className={labelCls}>Sprache</label>
        <input id="language" name="language" defaultValue={initial.language} placeholder="de" className={fieldCls} />
      </div>

      <div>
        <label htmlFor="tone" className={labelCls}>Ton (fuer Blitztext+)</label>
        <select id="tone" name="tone" defaultValue={initial.tone} className={fieldCls}>
          <option value="formal">Formell</option>
          <option value="neutral">Neutral</option>
          <option value="casual">Locker</option>
        </select>
      </div>

      <div>
        <label htmlFor="emojiDensity" className={labelCls}>Emoji-Menge (fuer Blitztext :)</label>
        <select id="emojiDensity" name="emojiDensity" defaultValue={initial.emojiDensity} className={fieldCls}>
          <option value="wenig">Wenig</option>
          <option value="mittel">Mittel</option>
          <option value="viel">Viel</option>
        </select>
      </div>

      <div>
        <label htmlFor="customTerms" className={labelCls}>Eigennamen / Fachbegriffe (Komma-getrennt)</label>
        <input id="customTerms" name="customTerms" defaultValue={initial.customTerms.join(", ")} placeholder="Infomaniak, Vercel, Supabase" className={fieldCls} />
      </div>

      <div>
        <label htmlFor="context" className={labelCls}>Kontext (optional)</label>
        <textarea id="context" name="context" defaultValue={initial.context} placeholder="z.B. geschaeftliche E-Mails auf Deutsch" className={`${fieldCls} min-h-20 resize-y`} />
      </div>

      {state.error && <p className="text-sm text-red-400">{state.error}</p>}
      {state.message && <p className="text-sm text-green-400">{state.message}</p>}

      <button type="submit" disabled={pending} className="w-full rounded-lg bg-accent py-2.5 font-medium text-white disabled:opacity-50">
        {pending ? "Speichern ..." : "Speichern"}
      </button>
    </form>
  );
}
