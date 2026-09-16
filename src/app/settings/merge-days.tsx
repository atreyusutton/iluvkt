"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { mergeSessionsByDay, type DayMergeCandidate } from "@/app/actions/misc";
import { Button, Card, CardTitle } from "@/components/ui";

/** Offers to fold days that were logged as several sessions into one entry each. */
export function MergeDays({ candidates }: { candidates: DayMergeCandidate[] }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  if (candidates.length === 0) return null;

  const totalAbsorbed = candidates.reduce((sum, day) => sum + day.sessions - 1, 0);

  const run = () => {
    const summary = candidates.map((day) => `${day.day}: ${day.sessions} sessions → 1`).join("\n");
    if (!confirm(`Combine these into one entry per day?\n\n${summary}\n\nThis can't be undone.`)) return;
    setError(null);
    startTransition(async () => {
      try {
        await mergeSessionsByDay();
        router.refresh();
      } catch (err) {
        setError(err instanceof Error ? err.message : String(err));
      }
    });
  };

  return (
    <Card>
      <CardTitle>Combine sessions by day</CardTitle>
      <p className="text-sm text-ink-2">
        {candidates.length === 1 ? "One day was" : `${candidates.length} days were`} logged as more than one session.
        Combining keeps the total time, notes and recordings, and leaves one journal entry per day.
      </p>
      <ul className="mt-3 space-y-1 text-sm text-ink-3">
        {candidates.map((day) => (
          <li key={day.day}>
            <span className="font-medium text-ink-2">{day.day}</span> — {day.sessions} sessions · {day.minutes} min
            {day.recordings > 0 && ` · ${day.recordings} ${day.recordings === 1 ? "take" : "takes"}`}
          </li>
        ))}
      </ul>
      <Button onClick={run} disabled={pending} className="mt-4">
        {pending ? "Combining…" : `Combine ${totalAbsorbed === 1 ? "1 session" : `${totalAbsorbed} sessions`}`}
      </Button>
      {error && <p className="mt-2 text-sm text-bad">{error}</p>}
    </Card>
  );
}
