// Status-Anzeige, Zustaende uebernommen aus windows-app overlay.html.
export type Status = "idle" | "recording" | "processing" | "done" | "error";

const DOT: Record<Status, string> = {
  idle: "bg-accent",
  recording: "bg-red-500 animate-pulse",
  processing: "bg-amber-500 animate-pulse",
  done: "bg-green-500",
  error: "bg-red-500",
};

export function StatusPill({ status, text }: { status: Status; text: string }) {
  return (
    <div className="flex items-center gap-2.5 rounded-full bg-card px-4 py-2 text-sm">
      <span className={`h-2.5 w-2.5 flex-none rounded-full ${DOT[status]}`} />
      <span className="text-muted">{text}</span>
    </div>
  );
}
