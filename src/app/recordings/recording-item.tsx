"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { deleteRecording, renameRecording, setRecordingStarred } from "@/app/actions/misc";
import { RecordingPlayer } from "@/components/recording-player";
import { cn } from "@/components/ui";
import { formatClock } from "@/lib/time";

type Item = {
  id: number;
  label: string;
  starred: boolean;
  durationSeconds: number;
  sessionId: number | null;
  songId: number | null;
  time: string;
  mimeType: string;
};

export function RecordingItem({ recording, songTitle }: { recording: Item; songTitle: string | null }) {
  const [label, setLabel] = useState(recording.label);
  const [editing, setEditing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const run = (action: () => Promise<void>, failure: string) => {
    setError(null);
    startTransition(async () => {
      try {
        await action();
      } catch (err) {
        setError(err instanceof Error ? `${failure}: ${err.message}` : failure);
      }
    });
  };

  const saveLabel = () => {
    setEditing(false);
    if (label.trim() === recording.label) return;
    run(() => renameRecording(recording.id, label), "Couldn't rename");
  };

  return (
    <li className={cn("relative rounded-2xl border border-border bg-surface p-4 shadow-sm", pending && "opacity-70")}>
      <span className="absolute -left-[23px] top-6 h-3 w-3 rounded-full border-2 border-bg bg-accent" />
      <div className="mb-2 flex flex-wrap items-center gap-x-3 gap-y-1">
        <button
          aria-label={recording.starred ? "Unstar" : "Star"}
          onClick={() => run(() => setRecordingStarred(recording.id, !recording.starred), "Couldn't update star")}
          className={cn("text-xl leading-none", recording.starred ? "text-accent" : "text-border hover:text-ink-3")}
        >
          ★
        </button>
        {editing ? (
          <input
            autoFocus
            value={label}
            onChange={(event) => setLabel(event.target.value)}
            onBlur={saveLabel}
            onKeyDown={(event) => {
              if (event.key === "Enter") saveLabel();
              if (event.key === "Escape") {
                setLabel(recording.label);
                setEditing(false);
              }
            }}
            className="field h-8 max-w-xs py-1"
          />
        ) : (
          <button onClick={() => setEditing(true)} className="font-medium hover:text-accent" title="Rename">
            {recording.mimeType.startsWith("video/") ? "🎥 " : ""}{label || "Untitled take"} <span className="text-xs text-ink-3">✎</span>
          </button>
        )}
        <span className="text-sm text-ink-3">
          {recording.time} · {formatClock(recording.durationSeconds)}
        </span>
        {songTitle && <span className="text-sm text-ink-3">♪ {songTitle}</span>}
        <span className="ml-auto flex items-center gap-3 text-sm">
          {recording.sessionId && (
            <Link href={`/journal/${recording.sessionId}`} className="text-accent hover:underline">
              Session
            </Link>
          )}
          <button
            onClick={() => {
              if (confirm("Delete this recording permanently?")) run(() => deleteRecording(recording.id), "Couldn't delete");
            }}
            className="text-ink-3 hover:text-bad"
          >
            Delete
          </button>
        </span>
      </div>
      <RecordingPlayer id={recording.id} mimeType={recording.mimeType} />
      {error && <p className="mt-2 text-sm text-bad">{error}</p>}
    </li>
  );
}
