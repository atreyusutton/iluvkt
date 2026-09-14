"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { retryJournal } from "@/app/actions/session";
import { Button } from "@/components/ui";

const POLL_MS = 3000;
const MAX_POLLS = 20;

/** While the journal is being written after the response, refresh until it lands (~60s max). */
export function JournalPending() {
  const router = useRouter();
  const [polls, setPolls] = useState(0);

  useEffect(() => {
    if (polls >= MAX_POLLS) return;
    const id = window.setTimeout(() => {
      router.refresh();
      setPolls((count) => count + 1);
    }, POLL_MS);
    return () => window.clearTimeout(id);
  }, [polls, router]);

  return (
    <div className="flex items-center gap-3 text-ink-2">
      {polls < MAX_POLLS ? (
        <>
          <span className="h-3 w-3 animate-pulse rounded-full bg-accent" />
          Writing your journal…
        </>
      ) : (
        <>
          Still waiting on the journal. <RetryJournalButton sessionId={null} label="Refresh" />
        </>
      )}
    </div>
  );
}

export function RetryJournalButton({ sessionId, label = "Try again" }: { sessionId: number | null; label?: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const run = () => {
    setError(null);
    startTransition(async () => {
      try {
        if (sessionId !== null) await retryJournal(sessionId);
        router.refresh();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Retry failed.");
      }
    });
  };

  return (
    <span className="inline-flex flex-col gap-1">
      <Button size="sm" variant="secondary" onClick={run} disabled={pending}>
        {pending ? "Writing…" : label}
      </Button>
      {error && <span className="text-xs text-bad">{error}</span>}
    </span>
  );
}
