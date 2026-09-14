"use client";

import { useState, useTransition } from "react";
import { setLessonComplete } from "@/app/actions/misc";
import { Button } from "@/components/ui";

export function LessonCompleteToggle({ slug, completed }: { slug: string; completed: boolean }) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const toggle = () => {
    setError(null);
    startTransition(async () => {
      try {
        await setLessonComplete(slug, !completed);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Couldn't update lesson.");
      }
    });
  };

  return (
    <div className="flex flex-col items-end gap-1">
      <Button variant={completed ? "secondary" : "primary"} onClick={toggle} disabled={pending}>
        {completed ? "Completed ✓" : "Mark complete"}
      </Button>
      {error && <span className="text-xs text-bad">{error}</span>}
    </div>
  );
}
