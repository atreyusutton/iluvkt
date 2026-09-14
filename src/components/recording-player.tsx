"use client";

import type { SyntheticEvent } from "react";

/**
 * Browser-recorded WebM files don't store their length, so the seek bar shows "∞".
 * Seeking far past the end once makes the browser scan the file and learn the real duration.
 */
function fixUnknownDuration(event: SyntheticEvent<HTMLMediaElement>) {
  const media = event.currentTarget;
  if (media.duration !== Infinity) return;
  const restore = () => {
    media.currentTime = 0;
    media.removeEventListener("durationchange", restore);
  };
  media.addEventListener("durationchange", restore);
  media.currentTime = Number.MAX_SAFE_INTEGER;
}

/** Plays a saved take — a video player for camera recordings, an audio bar otherwise. */
export function RecordingPlayer({ id, mimeType }: { id: number; mimeType: string }) {
  const src = `/api/recordings/${id}/audio`;
  if (mimeType.startsWith("video/")) {
    return (
      <video
        controls
        playsInline
        preload="metadata"
        src={src}
        onLoadedMetadata={fixUnknownDuration}
        className="max-h-[420px] w-full rounded-xl bg-black"
      />
    );
  }
  return <audio controls preload="metadata" src={src} onLoadedMetadata={fixUnknownDuration} className="w-full" />;
}
