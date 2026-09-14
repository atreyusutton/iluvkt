"use client";

import { useState, useTransition } from "react";
import { updateSettings } from "@/app/actions/misc";
import { Button } from "@/components/ui";

type Initial = { dailyGoalMinutes: number; playingFor: string; performanceDate: string; performanceNote: string };

export function SettingsForm({ initial }: { initial: Initial }) {
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<{ tone: "good" | "bad"; text: string } | null>(null);

  const submit = (formData: FormData) => {
    setMessage(null);
    startTransition(async () => {
      try {
        await updateSettings(formData);
        setMessage({ tone: "good", text: "Saved." });
      } catch (err) {
        setMessage({ tone: "bad", text: err instanceof Error ? err.message : "Couldn't save settings." });
      }
    });
  };

  return (
    <form action={submit} className="space-y-4">
      <label className="block">
        <span className="label">Daily goal (minutes)</span>
        <input name="dailyGoalMinutes" type="number" min={5} max={600} defaultValue={initial.dailyGoalMinutes} className="field" />
      </label>
      <label className="block">
        <span className="label">Playing for</span>
        <input name="playingFor" defaultValue={initial.playingFor} placeholder="Who are you learning this for?" className="field" />
      </label>
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block">
          <span className="label">Performance date</span>
          <input name="performanceDate" type="date" defaultValue={initial.performanceDate} className="field" />
        </label>
        <label className="block">
          <span className="label">What&apos;s the occasion?</span>
          <input name="performanceNote" defaultValue={initial.performanceNote} placeholder="e.g. her birthday" className="field" />
        </label>
      </div>
      <p className="text-xs text-ink-3">The performance date adds a countdown to your home page and milestones.</p>
      <div className="flex items-center gap-3">
        <Button type="submit" disabled={pending}>
          {pending ? "Saving…" : "Save settings"}
        </Button>
        {message && <span className={message.tone === "good" ? "text-sm text-good" : "text-sm text-bad"}>{message.text}</span>}
      </div>
    </form>
  );
}
