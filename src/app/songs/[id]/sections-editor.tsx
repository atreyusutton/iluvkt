"use client";

import { useState, useTransition } from "react";
import { addSection, deleteSection, updateSection } from "@/app/actions/songs";
import { Button, cn, ProgressBar } from "@/components/ui";
import type { SongSection } from "@/db/schema";

const STATUSES = ["learning", "okay", "nailed"] as const;

function barsToText(section: SongSection, beatsPerBar: number) {
  return section.bars.map((bar) => (bar.beats === beatsPerBar ? bar.chord : `${bar.chord}:${bar.beats}`)).join(" ");
}

function SectionRow({ section, beatsPerBar, targetBpm }: { section: SongSection; beatsPerBar: number; targetBpm: number }) {
  const [barsText, setBarsText] = useState(() => barsToText(section, beatsPerBar));
  const [notes, setNotes] = useState(section.notes);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const dirty = barsText !== barsToText(section, beatsPerBar) || notes !== section.notes;

  const run = (work: () => Promise<void>) => {
    setError(null);
    startTransition(async () => {
      try {
        await work();
      } catch (err) {
        setError(err instanceof Error ? err.message : String(err));
      }
    });
  };

  return (
    <div className="space-y-3 rounded-xl border border-border p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h3 className="font-display text-lg font-semibold">{section.name}</h3>
        <div className="flex rounded-lg bg-surface-2 p-0.5">
          {STATUSES.map((status) => (
            <button
              key={status}
              disabled={pending}
              onClick={() => run(() => updateSection(section.id, { status }))}
              className={cn(
                "rounded-md px-3 py-1 text-sm font-medium capitalize",
                section.status === status
                  ? status === "nailed" ? "bg-good text-white" : status === "okay" ? "bg-accent text-accent-ink" : "bg-ink text-bg"
                  : "text-ink-2",
              )}
            >
              {status}
            </button>
          ))}
        </div>
      </div>
      <div className="flex items-center gap-3 text-sm">
        <span className="w-28 shrink-0 text-ink-3">Best {section.bestBpm ?? "—"} / {targetBpm}</span>
        <ProgressBar value={section.bestBpm ?? 0} max={targetBpm} tone={(section.bestBpm ?? 0) >= targetBpm ? "good" : "accent"} />
      </div>
      <label className="block">
        <span className="label">Chords, one per bar (use C:2 for a 2-beat bar)</span>
        <input value={barsText} onChange={(event) => setBarsText(event.target.value)} className="field font-mono" />
      </label>
      <label className="block">
        <span className="label">Notes</span>
        <input value={notes} onChange={(event) => setNotes(event.target.value)} placeholder="e.g. watch the F → D7 change" className="field" />
      </label>
      <div className="flex items-center gap-2">
        <Button size="sm" disabled={!dirty || pending} onClick={() => run(() => updateSection(section.id, { barsText, notes }))}>
          Save
        </Button>
        <button
          className="ml-auto text-xs text-ink-3 hover:text-bad"
          onClick={() => {
            if (confirm(`Delete the ${section.name} section?`)) run(() => deleteSection(section.id));
          }}
        >
          Delete section
        </button>
      </div>
      {error && <p className="text-sm text-bad">{error}</p>}
    </div>
  );
}

export function SectionsEditor({
  songId,
  sections,
  beatsPerBar,
  targetBpm,
}: {
  songId: number;
  sections: SongSection[];
  beatsPerBar: number;
  targetBpm: number;
}) {
  const [name, setName] = useState("");
  const [pending, startTransition] = useTransition();
  return (
    <div className="space-y-4">
      {sections.map((section) => (
        <SectionRow key={`${section.id}-${section.bars.length}-${section.notes}`} section={section} beatsPerBar={beatsPerBar} targetBpm={targetBpm} />
      ))}
      <div className="flex gap-2">
        <input value={name} onChange={(event) => setName(event.target.value)} placeholder="New section name, e.g. Chorus" className="field" />
        <Button
          variant="secondary"
          disabled={!name.trim() || pending}
          onClick={() => startTransition(async () => { await addSection(songId, name); setName(""); })}
          className="shrink-0"
        >
          Add section
        </Button>
      </div>
    </div>
  );
}
