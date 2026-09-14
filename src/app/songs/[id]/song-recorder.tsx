"use client";

import { Recorder } from "@/components/recorder";

export function SongRecorder({ songId }: { songId: number }) {
  return <Recorder songId={songId} />;
}
