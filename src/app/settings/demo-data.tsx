"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Button } from "@/components/ui";

/** Dev-only controls for staging the app with sample data. */
export function DemoData() {
  const router = useRouter();
  const [message, setMessage] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const run = (action: "seed" | "clear", confirmText: string) => {
    if (!confirm(confirmText)) return;
    setMessage(null);
    startTransition(async () => {
      try {
        const response = await fetch("/api/dev/demo", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action }),
        });
        const body = (await response.json()) as { error?: string; sessions?: number; recordingsRemoved?: number };
        if (!response.ok) throw new Error(body.error ?? `Failed (${response.status})`);
        setMessage(action === "seed" ? `Loaded ${body.sessions} sessions across 14 days.` : `Cleared all practice data (${body.recordingsRemoved} recordings).`);
        router.refresh();
      } catch (error) {
        setMessage(error instanceof Error ? error.message : String(error));
      }
    });
  };

  return (
    <div className="space-y-3">
      <p className="text-sm text-ink-2">
        Stage the app with 14 days of sample practice — sessions, journal entries, drill scores, lessons and generated audio takes.
        Only available while running locally.
      </p>
      <div className="flex flex-wrap gap-2">
        <Button
          variant="secondary"
          disabled={pending}
          onClick={() => run("seed", "Replace all practice data with 14 days of demo data?")}
        >
          Load 14-day demo
        </Button>
        <Button
          variant="danger"
          disabled={pending}
          onClick={() => run("clear", "Delete ALL practice sessions, journals, drills, lesson progress and recordings? This can't be undone.")}
        >
          Clear practice data
        </Button>
      </div>
      {message && <p className="text-sm text-ink-2">{message}</p>}
    </div>
  );
}
