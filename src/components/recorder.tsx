"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { formatClock } from "@/lib/time";
import { Button, cn } from "./ui";

type Phase = "idle" | "recording" | "review" | "saving";

function pickMimeType(): string {
  const candidates = ["audio/webm;codecs=opus", "audio/mp4", "audio/ogg;codecs=opus", "audio/webm"];
  return candidates.find((type) => MediaRecorder.isTypeSupported(type)) ?? "";
}

/** Records from the mic, lets you listen back, then uploads the take (tagged to the session/song). */
export function Recorder({
  sessionId,
  songId,
  defaultLabel = "",
  compact = false,
}: {
  sessionId?: number | null;
  songId?: number | null;
  defaultLabel?: string;
  compact?: boolean;
}) {
  const router = useRouter();
  const [phase, setPhase] = useState<Phase>("idle");
  const [error, setError] = useState<string | null>(null);
  const [savedMessage, setSavedMessage] = useState<string | null>(null);
  const [seconds, setSeconds] = useState(0);
  const [level, setLevel] = useState(0);
  const [take, setTake] = useState<{ blob: Blob; url: string; seconds: number } | null>(null);
  const [label, setLabel] = useState(defaultLabel);

  const recorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const frameRef = useRef<number | null>(null);
  const startedAtRef = useRef(0);

  const releaseMic = () => {
    if (frameRef.current !== null) cancelAnimationFrame(frameRef.current);
    frameRef.current = null;
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    audioContextRef.current?.close().catch((err: unknown) => console.warn("Closing AudioContext failed", err));
    audioContextRef.current = null;
  };

  useEffect(() => {
    return () => {
      if (recorderRef.current?.state === "recording") recorderRef.current.stop();
      releaseMic();
    };
  }, []);

  useEffect(() => {
    return () => {
      if (take) URL.revokeObjectURL(take.url);
    };
  }, [take]);

  const start = async () => {
    setError(null);
    setSavedMessage(null);
    if (typeof MediaRecorder === "undefined") {
      setError("This browser can't record audio.");
      return;
    }
    let stream: MediaStream;
    try {
      // Voice processing mangles guitar tone, so switch it off.
      stream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: false },
      });
    } catch (err) {
      const denied = err instanceof DOMException && err.name === "NotAllowedError";
      setError(denied ? "Microphone access was blocked. Allow it in your browser's site settings." : `Couldn't open the microphone: ${String(err)}`);
      return;
    }
    streamRef.current = stream;

    const context = new AudioContext();
    audioContextRef.current = context;
    const analyser = context.createAnalyser();
    analyser.fftSize = 1024;
    context.createMediaStreamSource(stream).connect(analyser);
    const buffer = new Float32Array(analyser.fftSize);
    const tick = () => {
      analyser.getFloatTimeDomainData(buffer);
      let peak = 0;
      for (const sample of buffer) peak = Math.max(peak, Math.abs(sample));
      setLevel(peak);
      setSeconds((Date.now() - startedAtRef.current) / 1000);
      frameRef.current = requestAnimationFrame(tick);
    };

    const mimeType = pickMimeType();
    const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
    const chunks: Blob[] = [];
    recorder.ondataavailable = (event) => {
      if (event.data.size > 0) chunks.push(event.data);
    };
    recorder.onstop = () => {
      const blob = new Blob(chunks, { type: recorder.mimeType || mimeType || "audio/webm" });
      const duration = (Date.now() - startedAtRef.current) / 1000;
      releaseMic();
      setTake({ blob, url: URL.createObjectURL(blob), seconds: duration });
      setPhase("review");
    };
    recorder.onerror = (event) => {
      setError(`Recording failed: ${String((event as ErrorEvent).message ?? "unknown error")}`);
      releaseMic();
      setPhase("idle");
    };
    recorderRef.current = recorder;
    startedAtRef.current = Date.now();
    recorder.start(1000);
    setSeconds(0);
    setPhase("recording");
    frameRef.current = requestAnimationFrame(tick);
  };

  const stop = () => recorderRef.current?.stop();

  const discard = () => {
    setTake(null);
    setPhase("idle");
  };

  const save = async () => {
    if (!take) return;
    setPhase("saving");
    setError(null);
    const form = new FormData();
    form.set("file", take.blob, "take");
    form.set("durationSeconds", String(Math.round(take.seconds)));
    form.set("label", label);
    if (sessionId) form.set("sessionId", String(sessionId));
    if (songId) form.set("songId", String(songId));
    try {
      const response = await fetch("/api/recordings", { method: "POST", body: form });
      const body = (await response.json()) as { error?: string };
      if (!response.ok) throw new Error(body.error ?? `Upload failed (${response.status})`);
      setTake(null);
      setPhase("idle");
      setSavedMessage("Saved to your recordings ✓");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      setPhase("review");
    }
  };

  return (
    <div className={cn("space-y-3", compact && "text-sm")}>
      {phase === "idle" && (
        <div className="flex flex-wrap items-center gap-3">
          <Button variant="rose" onClick={start}>
            <span className="h-2.5 w-2.5 rounded-full bg-white" /> Record a take
          </Button>
          {savedMessage && <span className="text-sm text-good">{savedMessage}</span>}
        </div>
      )}

      {phase === "recording" && (
        <div className="flex flex-wrap items-center gap-4">
          <Button variant="secondary" onClick={stop}>
            <span className="h-2.5 w-2.5 rounded-sm bg-rose" /> Stop
          </Button>
          <span className="flex items-center gap-2 font-mono tabular-nums">
            <span className="h-2.5 w-2.5 animate-pulse rounded-full bg-rose" />
            {formatClock(seconds)}
          </span>
          <div className="h-2 min-w-24 flex-1 overflow-hidden rounded-full bg-surface-2" aria-label="Input level">
            <div
              className={cn("h-full rounded-full transition-[width] duration-75", level > 0.95 ? "bg-bad" : "bg-good")}
              style={{ width: `${Math.min(100, level * 100)}%` }}
            />
          </div>
        </div>
      )}

      {(phase === "review" || phase === "saving") && take && (
        <div className="space-y-3 rounded-xl border border-border bg-surface-2 p-3">
          <audio controls src={take.url} className="w-full" />
          <input value={label} onChange={(event) => setLabel(event.target.value)} placeholder="Label, e.g. 'Verse at 70 BPM'" className="field" />
          <div className="flex gap-2">
            <Button onClick={save} disabled={phase === "saving"}>
              {phase === "saving" ? "Saving…" : "Save take"}
            </Button>
            <Button variant="ghost" onClick={discard} disabled={phase === "saving"}>
              Discard
            </Button>
          </div>
        </div>
      )}

      {error && <p className="text-sm text-bad">{error}</p>}
    </div>
  );
}
