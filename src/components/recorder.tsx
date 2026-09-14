"use client";

import Link from "next/link";
import { useRecording } from "./recording-provider";
import { Button } from "./ui";

/** Record buttons. The recording itself lives in the top bar so it survives navigation. */
export function Recorder({ songId, defaultLabel }: { songId?: number | null; defaultLabel?: string }) {
  const { phase, mode, error, lastSaved, start } = useRecording();

  if (phase !== "idle") {
    return (
      <p className="rounded-xl bg-rose-soft px-3 py-2 text-sm text-rose">
        {phase === "review" || phase === "saving"
          ? "Your take is waiting in the bar at the top — save or discard it."
          : `Recording ${mode ?? ""} in the top bar. Browse anywhere; press Stop up there when you're done.`}
      </p>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <Button variant="rose" onClick={() => start("audio", { songId, label: defaultLabel })}>
          <span className="h-2.5 w-2.5 rounded-full bg-white" /> Record audio
        </Button>
        <Button variant="secondary" onClick={() => start("video", { songId, label: defaultLabel })}>
          <span className="h-2.5 w-2.5 rounded-full bg-rose" /> Record video
        </Button>
      </div>
      {lastSaved && (
        <p className="text-sm text-good">
          Saved ✓ <Link href="/recordings" className="underline">View recordings</Link>
        </p>
      )}
      {error && <p className="text-sm text-bad">{error}</p>}
    </div>
  );
}
