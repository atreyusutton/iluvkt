"use client";

import { upload } from "@vercel/blob/client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { getPracticeState } from "@/lib/practice-store";
import { formatClock } from "@/lib/time";
import { useNow } from "@/lib/use-now";
import { Button, cn } from "./ui";

export type RecordingMode = "audio" | "video";
type Phase = "idle" | "starting" | "recording" | "paused" | "review" | "saving";
type Take = { blob: Blob; url: string; seconds: number; mode: RecordingMode };

type RecordingContextValue = {
  phase: Phase;
  mode: RecordingMode | null;
  error: string | null;
  lastSaved: number | null;
  start: (mode: RecordingMode, options?: { songId?: number | null; label?: string }) => Promise<void>;
  stop: () => void;
};

const RecordingContext = createContext<RecordingContextValue | null>(null);

export function useRecording() {
  const value = useContext(RecordingContext);
  if (!value) throw new Error("useRecording must be used inside <RecordingProvider>");
  return value;
}

const AUDIO_TYPES = ["audio/webm;codecs=opus", "audio/mp4", "audio/ogg;codecs=opus", "audio/webm"];
const VIDEO_TYPES = ["video/webm;codecs=vp9,opus", "video/webm;codecs=vp8,opus", "video/mp4", "video/webm"];

function pickMimeType(mode: RecordingMode) {
  return (mode === "video" ? VIDEO_TYPES : AUDIO_TYPES).find((type) => MediaRecorder.isTypeSupported(type)) ?? "";
}

function extensionFor(mimeType: string) {
  if (mimeType.startsWith("video/mp4")) return "mp4";
  if (mimeType.includes("mp4")) return "m4a";
  if (mimeType.includes("ogg")) return "ogg";
  return "webm";
}

/**
 * Owns the microphone/camera for the whole site. Because it lives in the root layout,
 * a recording keeps going while you navigate between pages — only Stop ends it.
 */
export function RecordingProvider({ children, backend }: { children: ReactNode; backend: "blob" | "local" }) {
  const router = useRouter();
  const [phase, setPhase] = useState<Phase>("idle");
  const [mode, setMode] = useState<RecordingMode | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [take, setTake] = useState<Take | null>(null);
  const [label, setLabel] = useState("");
  const [progress, setProgress] = useState<number | null>(null);
  const [level, setLevel] = useState(0);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [lastSaved, setLastSaved] = useState<number | null>(null);

  const recorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const frameRef = useRef<number | null>(null);
  // Timing lives in state for rendering and in a ref for the recorder's onstop callback.
  const [timing, setTimingState] = useState({ accumulatedMs: 0, runningSince: 0 });
  const timingRef = useRef(timing);
  const setTiming = useCallback((next: { accumulatedMs: number; runningSince: number }) => {
    timingRef.current = next;
    setTimingState(next);
  }, []);
  const tagsRef = useRef<{ songId: number | null; sessionId: number | null }>({ songId: null, sessionId: null });

  const active = phase === "recording" || phase === "paused";
  const now = useNow(250, active);
  const elapsedSeconds =
    (timing.accumulatedMs + (phase === "recording" ? Math.max(0, now - timing.runningSince) : 0)) / 1000;

  const releaseDevices = useCallback(() => {
    if (frameRef.current !== null) cancelAnimationFrame(frameRef.current);
    frameRef.current = null;
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    setStream(null);
    audioContextRef.current?.close().catch((err: unknown) => console.warn("Closing AudioContext failed", err));
    audioContextRef.current = null;
    setLevel(0);
  }, []);

  const start = useCallback<RecordingContextValue["start"]>(
    async (nextMode, options) => {
      if (phase !== "idle") return;
      setError(null);
      if (typeof MediaRecorder === "undefined" || !navigator.mediaDevices) {
        setError("This browser can't record.");
        return;
      }
      setPhase("starting");
      let media: MediaStream;
      try {
        // Voice processing (echo cancellation etc.) mangles guitar tone, so it's off.
        media = await navigator.mediaDevices.getUserMedia({
          audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: false },
          video: nextMode === "video" ? { facingMode: "user", width: { ideal: 1280 }, height: { ideal: 720 } } : false,
        });
      } catch (err) {
        const denied = err instanceof DOMException && err.name === "NotAllowedError";
        setError(
          denied
            ? `${nextMode === "video" ? "Camera or microphone" : "Microphone"} access was blocked. Allow it in your browser's site settings.`
            : `Couldn't start recording: ${err instanceof Error ? err.message : String(err)}`,
        );
        setPhase("idle");
        return;
      }

      const context = new AudioContext();
      audioContextRef.current = context;
      const analyser = context.createAnalyser();
      analyser.fftSize = 1024;
      context.createMediaStreamSource(media).connect(analyser);
      const buffer = new Float32Array(analyser.fftSize);
      const meter = () => {
        analyser.getFloatTimeDomainData(buffer);
        let peak = 0;
        for (const sample of buffer) peak = Math.max(peak, Math.abs(sample));
        setLevel(peak);
        frameRef.current = requestAnimationFrame(meter);
      };
      frameRef.current = requestAnimationFrame(meter);

      const mimeType = pickMimeType(nextMode);
      const recorder = new MediaRecorder(media, {
        ...(mimeType ? { mimeType } : {}),
        audioBitsPerSecond: 128_000,
        ...(nextMode === "video" ? { videoBitsPerSecond: 1_500_000 } : {}),
      });
      const chunks: Blob[] = [];
      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) chunks.push(event.data);
      };
      recorder.onstop = () => {
        const timing = timingRef.current;
        const seconds = (timing.accumulatedMs + (timing.runningSince ? Date.now() - timing.runningSince : 0)) / 1000;
        const blob = new Blob(chunks, { type: recorder.mimeType || mimeType || (nextMode === "video" ? "video/webm" : "audio/webm") });
        releaseDevices();
        setTake({ blob, url: URL.createObjectURL(blob), seconds, mode: nextMode });
        setPhase("review");
      };
      recorder.onerror = (event) => {
        setError(`Recording failed: ${String((event as ErrorEvent).message ?? "unknown error")}`);
        releaseDevices();
        setPhase("idle");
      };

      tagsRef.current = {
        songId: options?.songId ?? getPracticeState()?.draft.songId ?? null,
        sessionId: getPracticeState()?.sessionId ?? null,
      };
      setTiming({ accumulatedMs: 0, runningSince: Date.now() });
      recorderRef.current = recorder;
      recorder.start(1000);
      setLabel(options?.label ?? "");
      setMode(nextMode);
      streamRef.current = media;
      setStream(media);
      setPhase("recording");
    },
    [phase, releaseDevices, setTiming],
  );

  const stop = useCallback(() => {
    const recorder = recorderRef.current;
    if (!recorder || recorder.state === "inactive") return;
    recorder.stop();
  }, []);

  const togglePause = () => {
    const recorder = recorderRef.current;
    if (!recorder) return;
    if (recorder.state === "recording") {
      recorder.pause();
      setTiming({ accumulatedMs: timingRef.current.accumulatedMs + Date.now() - timingRef.current.runningSince, runningSince: 0 });
      setPhase("paused");
    } else if (recorder.state === "paused") {
      recorder.resume();
      setTiming({ ...timingRef.current, runningSince: Date.now() });
      setPhase("recording");
    }
  };

  const discard = () => {
    if (take) URL.revokeObjectURL(take.url);
    setTake(null);
    setMode(null);
    setProgress(null);
    setPhase("idle");
  };

  const save = async () => {
    if (!take) return;
    setPhase("saving");
    setError(null);
    setProgress(0);
    const mimeType = take.blob.type;
    // A session started mid-recording still gets the take.
    const sessionId = tagsRef.current.sessionId ?? getPracticeState()?.sessionId ?? null;
    const meta = {
      sessionId,
      songId: tagsRef.current.songId,
      durationSeconds: Math.round(take.seconds),
      label: label.trim(),
    };
    try {
      if (backend === "blob") {
        const stamp = new Date().toISOString().replace(/[:.]/g, "-");
        const result = await upload(`recordings/${stamp}.${extensionFor(mimeType)}`, take.blob, {
          access: "private",
          handleUploadUrl: "/api/recordings/upload",
          contentType: mimeType,
          multipart: take.blob.size > 20 * 1024 * 1024,
          onUploadProgress: ({ percentage }) => setProgress(percentage),
        });
        const response = await fetch("/api/recordings", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ...meta, pathname: result.pathname, mimeType, sizeBytes: take.blob.size }),
        });
        const body = (await response.json()) as { error?: string };
        if (!response.ok) throw new Error(body.error ?? `Saving failed (${response.status})`);
      } else {
        const params = new URLSearchParams();
        for (const [key, value] of Object.entries(meta)) if (value !== null && value !== "") params.set(key, String(value));
        const response = await fetch(`/api/recording-upload?${params}`, {
          method: "POST",
          headers: { "Content-Type": mimeType },
          body: take.blob,
        });
        const body = (await response.json()) as { error?: string };
        if (!response.ok) throw new Error(body.error ?? `Upload failed (${response.status})`);
      }
      URL.revokeObjectURL(take.url);
      setTake(null);
      setMode(null);
      setProgress(null);
      setLastSaved(Date.now());
      setPhase("idle");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      setProgress(null);
      setPhase("review");
    }
  };

  // Closing or reloading the tab would lose the take, so ask first.
  useEffect(() => {
    if (phase === "idle") return;
    const warn = (event: BeforeUnloadEvent) => event.preventDefault();
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [phase]);

  useEffect(() => () => {
    if (recorderRef.current?.state !== "inactive") recorderRef.current?.stop();
  }, []);

  const value = useMemo<RecordingContextValue>(
    () => ({ phase, mode, error, lastSaved, start, stop }),
    [phase, mode, error, lastSaved, start, stop],
  );

  return (
    <RecordingContext.Provider value={value}>
      {phase !== "idle" && (
        <RecordingBar
          phase={phase}
          mode={mode}
          seconds={phase === "review" || phase === "saving" ? take?.seconds ?? 0 : elapsedSeconds}
          level={level}
          stream={stream}
          take={take}
          label={label}
          progress={progress}
          error={error}
          onLabel={setLabel}
          onStop={stop}
          onTogglePause={togglePause}
          onSave={save}
          onDiscard={discard}
        />
      )}
      {children}
    </RecordingContext.Provider>
  );
}

function LivePreview({ stream }: { stream: MediaStream }) {
  const ref = useRef<HTMLVideoElement>(null);
  useEffect(() => {
    if (ref.current) ref.current.srcObject = stream;
  }, [stream]);
  return <video ref={ref} autoPlay muted playsInline className="h-10 w-16 shrink-0 -scale-x-100 rounded-md bg-black object-cover" />;
}

function RecordingBar({
  phase,
  mode,
  seconds,
  level,
  stream,
  take,
  label,
  progress,
  error,
  onLabel,
  onStop,
  onTogglePause,
  onSave,
  onDiscard,
}: {
  phase: Phase;
  mode: RecordingMode | null;
  seconds: number;
  level: number;
  stream: MediaStream | null;
  take: Take | null;
  label: string;
  progress: number | null;
  error: string | null;
  onLabel: (value: string) => void;
  onStop: () => void;
  onTogglePause: () => void;
  onSave: () => void;
  onDiscard: () => void;
}) {
  const reviewing = phase === "review" || phase === "saving";
  return (
    <>
      <div className="fixed inset-x-0 top-0 z-50" role="region" aria-label="Recording">
        <div className="flex h-14 items-center gap-3 border-b border-rose/30 bg-ink px-4 text-bg shadow-lg">
          {phase === "starting" && <span className="text-sm">Waiting for {mode === "video" ? "camera" : "microphone"}…</span>}

          {(phase === "recording" || phase === "paused") && (
            <>
              <span className={cn("h-3 w-3 shrink-0 rounded-full bg-rose", phase === "recording" && "animate-pulse")} />
              {mode === "video" && stream && <LivePreview stream={stream} />}
              <span className="font-mono text-lg tabular-nums">{formatClock(seconds)}</span>
              <span className="hidden text-sm text-bg/70 sm:inline">
                {phase === "paused" ? "Paused" : `Recording ${mode}`} — keep browsing, it won&apos;t stop
              </span>
              <div className="mx-2 hidden h-1.5 w-24 overflow-hidden rounded-full bg-bg/20 md:block" aria-label="Input level">
                <div className={cn("h-full rounded-full", level > 0.95 ? "bg-bad" : "bg-good")} style={{ width: `${Math.min(100, level * 100)}%` }} />
              </div>
              <div className="ml-auto flex items-center gap-2">
                <button onClick={onTogglePause} className="h-9 rounded-lg border border-bg/30 px-3 text-sm font-medium hover:bg-bg/10">
                  {phase === "paused" ? "Resume" : "Pause"}
                </button>
                <button onClick={onStop} className="flex h-9 items-center gap-2 rounded-lg bg-rose px-4 text-sm font-semibold text-white hover:brightness-110">
                  <span className="h-2.5 w-2.5 rounded-sm bg-white" /> Stop
                </button>
              </div>
            </>
          )}

          {reviewing && (
            <>
              <span className="text-sm font-medium">
                {mode === "video" ? "Video" : "Audio"} take · {formatClock(seconds)}
              </span>
              <span className="ml-auto text-sm text-bg/70">
                {phase === "saving" ? (progress !== null ? `Uploading ${Math.round(progress)}%` : "Saving…") : "Review below"}
              </span>
            </>
          )}
        </div>

        {reviewing && take && (
          <div className="border-b border-border bg-surface p-4 shadow-xl">
            <div className="mx-auto flex max-w-3xl flex-col gap-3">
              {take.mode === "video" ? (
                <video controls playsInline src={take.url} className="max-h-[50dvh] w-full rounded-xl bg-black" />
              ) : (
                <audio controls src={take.url} className="w-full" />
              )}
              <input value={label} onChange={(event) => onLabel(event.target.value)} placeholder="Label, e.g. 'Verse at 70 BPM'" className="field" />
              <div className="flex flex-wrap items-center gap-2">
                <Button onClick={onSave} disabled={phase === "saving"}>
                  {phase === "saving" ? "Saving…" : "Save take"}
                </Button>
                <Button variant="ghost" onClick={onDiscard} disabled={phase === "saving"}>
                  Discard
                </Button>
                <Link href="/recordings" className="ml-auto text-sm text-accent hover:underline">All recordings</Link>
              </div>
              {error && <p className="text-sm text-bad">{error}</p>}
            </div>
          </div>
        )}
      </div>
      {/* Keeps page content from sliding under the bar. */}
      <div className="h-14" aria-hidden />
    </>
  );
}
