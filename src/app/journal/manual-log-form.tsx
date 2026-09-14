"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { logManualSession } from "@/app/actions/session";
import { Button, cn } from "@/components/ui";
import { FOCUS_AREAS } from "@/content/focus-areas";

function localToday() {
  const now = new Date();
  return new Date(now.getTime() - now.getTimezoneOffset() * 60_000).toISOString().slice(0, 10);
}

export function ManualLogForm({
  songs,
  initiallyOpen = false,
}: {
  songs: { id: number; title: string }[];
  initiallyOpen?: boolean;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(initiallyOpen);
  const [date, setDate] = useState(localToday);
  const [minutes, setMinutes] = useState(30);
  const [focusAreas, setFocusAreas] = useState<string[]>([]);
  const [songId, setSongId] = useState<number | null>(songs[0]?.id ?? null);
  const [notes, setNotes] = useState("");
  const [rating, setRating] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  if (!open) {
    return (
      <Button variant="secondary" onClick={() => setOpen(true)}>
        + Log practice manually
      </Button>
    );
  }

  const toggleArea = (area: string) =>
    setFocusAreas((current) => (current.includes(area) ? current.filter((a) => a !== area) : [...current, area]));

  const submit = () => {
    setError(null);
    startTransition(async () => {
      try {
        const { id } = await logManualSession({
          date,
          durationSeconds: minutes * 60,
          focusAreas,
          songId,
          sectionIds: [],
          bpm: null,
          rating,
          notes,
        });
        router.push(`/journal/${id}`);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Couldn't log that session.");
      }
    });
  };

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/40 p-4" onClick={() => setOpen(false)}>
      <div
        role="dialog"
        aria-label="Log practice manually"
        className="max-h-[90dvh] w-full max-w-lg overflow-y-auto rounded-2xl border border-border bg-surface p-5 shadow-xl"
        onClick={(event) => event.stopPropagation()}
      >
        <h2 className="mb-4 font-display text-xl font-semibold">Log practice</h2>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <label>
              <span className="label">Date</span>
              <input type="date" value={date} max={localToday()} onChange={(e) => setDate(e.target.value)} className="field" />
            </label>
            <label>
              <span className="label">Minutes</span>
              <input
                type="number"
                min={1}
                max={600}
                value={minutes}
                onChange={(e) => setMinutes(Number(e.target.value))}
                className="field"
              />
            </label>
          </div>
          <div>
            <span className="label">Focus areas</span>
            <div className="flex flex-wrap gap-2">
              {FOCUS_AREAS.map((area) => (
                <button
                  key={area}
                  type="button"
                  onClick={() => toggleArea(area)}
                  className={cn(
                    "rounded-full border px-3 py-1 text-sm",
                    focusAreas.includes(area) ? "border-accent bg-accent-soft text-accent" : "border-border text-ink-2",
                  )}
                >
                  {area}
                </button>
              ))}
            </div>
          </div>
          <label className="block">
            <span className="label">Song</span>
            <select
              value={songId ?? ""}
              onChange={(e) => setSongId(e.target.value ? Number(e.target.value) : null)}
              className="field"
            >
              <option value="">None</option>
              {songs.map((song) => (
                <option key={song.id} value={song.id}>
                  {song.title}
                </option>
              ))}
            </select>
          </label>
          <div>
            <span className="label">How did it go?</span>
            <div className="flex gap-1 text-2xl">
              {[1, 2, 3, 4, 5].map((value) => (
                <button
                  key={value}
                  type="button"
                  aria-label={`${value} stars`}
                  onClick={() => setRating(rating === value ? null : value)}
                  className={value <= (rating ?? 0) ? "text-accent" : "text-border"}
                >
                  ★
                </button>
              ))}
            </div>
          </div>
          <label className="block">
            <span className="label">Notes</span>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              placeholder="What did you work on? What felt hard?"
              className="field"
            />
          </label>
          {error && <p className="text-sm text-bad">{error}</p>}
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button onClick={submit} disabled={pending || minutes < 1 || !date}>
              {pending ? "Saving…" : "Save session"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
