// Client-seitige Audio-Aufnahme via MediaRecorder.
// Portiert aus windows-app/src/renderer/overlay.html, erweitert um Mime-Erkennung:
// iOS Safari unterstuetzt kein audio/webm, liefert audio/mp4.

export interface Recording {
  blob: Blob;
  durationSec: number;
  fileName: string;
}

// Erster unterstuetzter Typ gewinnt. Endung passend fuer Whisper.
const CANDIDATES: { mime: string; ext: string }[] = [
  { mime: "audio/webm", ext: "webm" },
  { mime: "audio/mp4", ext: "m4a" },
  { mime: "audio/mpeg", ext: "mp3" },
];

function pickType(): { mime: string; ext: string } {
  if (typeof MediaRecorder !== "undefined") {
    for (const c of CANDIDATES) {
      if (MediaRecorder.isTypeSupported(c.mime)) return c;
    }
  }
  // Fallback: Browser entscheidet selbst, Endung neutral.
  return { mime: "", ext: "webm" };
}

export class AudioRecorder {
  private recorder: MediaRecorder | null = null;
  private stream: MediaStream | null = null;
  private chunks: Blob[] = [];
  private startTime = 0;
  private ext = "webm";
  private mime = "";

  /** Mikrofon anfordern und Aufnahme starten. Wirft bei verweigerter Permission. */
  async start(): Promise<void> {
    this.stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    const { mime, ext } = pickType();
    this.mime = mime;
    this.ext = ext;
    this.chunks = [];
    this.recorder = new MediaRecorder(
      this.stream,
      mime ? { mimeType: mime } : undefined
    );
    this.recorder.ondataavailable = (e) => {
      if (e.data.size > 0) this.chunks.push(e.data);
    };
    this.startTime = performance.now();
    this.recorder.start();
  }

  /** Aktiven Stream fuer einen Pegel-Meter zurueckgeben (oder null). */
  getStream(): MediaStream | null {
    return this.stream;
  }

  /** Aufnahme stoppen und Ergebnis liefern. */
  stop(): Promise<Recording> {
    return new Promise((resolve, reject) => {
      const rec = this.recorder;
      if (!rec) {
        reject(new Error("Keine aktive Aufnahme"));
        return;
      }
      rec.onstop = () => {
        const durationSec = (performance.now() - this.startTime) / 1000;
        const type = this.mime || rec.mimeType || "audio/webm";
        const blob = new Blob(this.chunks, { type });
        this.cleanup();
        resolve({ blob, durationSec, fileName: `audio.${this.ext}` });
      };
      if (rec.state !== "inactive") rec.stop();
    });
  }

  private cleanup(): void {
    this.stream?.getTracks().forEach((t) => t.stop());
    this.stream = null;
    this.recorder = null;
  }
}
