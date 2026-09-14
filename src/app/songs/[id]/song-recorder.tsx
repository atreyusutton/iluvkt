"use client";

import { Recorder } from "@/components/recorder";
import { usePracticeState } from "@/lib/practice-store";

/** Attaches takes to the running practice session, if there is one. */
export function SongRecorder({ songId }: { songId: number }) {
  const practice = usePracticeState();
  return <Recorder songId={songId} sessionId={practice?.sessionId ?? null} />;
}
