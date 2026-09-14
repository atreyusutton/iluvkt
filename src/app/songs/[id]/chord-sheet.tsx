"use client";

import { useState, useTransition } from "react";
import { saveChordSheet } from "@/app/actions/songs";
import { Button } from "@/components/ui";
import { cleanPastedTab, parseChordSheet } from "@/lib/chordpro";

export function ChordSheet({ songId, initial }: { songId: number; initial: string }) {
  const [source, setSource] = useState(initial);
  const [editing, setEditing] = useState(false);
  const [fontSize, setFontSize] = useState(16);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const lines = parseChordSheet(source);

  const save = (next = source) => {
    setError(null);
    startTransition(async () => {
      try {
        await saveChordSheet(songId, next);
        setSource(next);
        setEditing(false);
      } catch (err) {
        setError(err instanceof Error ? err.message : String(err));
      }
    });
  };

  const pasteFromClipboard = async () => {
    setError(null);
    let text: string;
    try {
      text = await navigator.clipboard.readText();
    } catch (err) {
      setError(`Couldn't read the clipboard (${err instanceof Error ? err.message : String(err)}). Use "Edit" and paste with ⌘V instead.`);
      return;
    }
    if (!text.trim()) {
      setError("Your clipboard is empty — copy the tab first.");
      return;
    }
    save(cleanPastedTab(text));
  };

  if (editing) {
    return (
      <div className="space-y-3">
        <p className="text-sm text-ink-2">
          <code className="rounded bg-surface-2 px-1"># Verse</code> makes a heading,{" "}
          <code className="rounded bg-surface-2 px-1">&gt; note</code> a note, and{" "}
          <code className="rounded bg-surface-2 px-1">[G]word</code> puts a chord above a word.
        </p>
        <textarea value={source} onChange={(event) => setSource(event.target.value)} rows={24} className="field font-mono" spellCheck={false} />
        <div className="flex gap-2">
          <Button onClick={() => save()} disabled={pending}>{pending ? "Saving…" : "Save sheet"}</Button>
          <Button variant="secondary" onClick={() => setSource((current) => cleanPastedTab(current))} disabled={pending}>Tidy pasted tab</Button>
          <Button variant="ghost" onClick={() => { setSource(initial); setEditing(false); }} disabled={pending}>Cancel</Button>
        </div>
        {error && <p className="text-sm text-bad">{error}</p>}
      </div>
    );
  }

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center justify-end gap-2">
        <Button variant="ghost" size="sm" onClick={() => setFontSize((size) => Math.max(12, size - 2))} aria-label="Smaller text">A−</Button>
        <Button variant="ghost" size="sm" onClick={() => setFontSize((size) => Math.min(28, size + 2))} aria-label="Larger text">A+</Button>
        <Button variant="secondary" size="sm" onClick={() => setEditing(true)}>Edit</Button>
        <Button size="sm" onClick={pasteFromClipboard} disabled={pending}>{pending ? "Saving…" : "Paste tab from clipboard"}</Button>
      </div>
      {error && <p className="mb-3 text-sm text-bad">{error}</p>}
      <div style={{ fontSize }} className="overflow-x-auto leading-snug">
        {lines.map((line, index) => {
          if (line.type === "blank") return <div key={index} className="h-[0.9em]" />;
          if (line.type === "heading")
            return <h3 key={index} className="pb-1 pt-3 font-display text-[1.15em] font-semibold text-rose">{line.text}</h3>;
          if (line.type === "note")
            return <p key={index} className="my-1 rounded-lg bg-surface-2 px-3 py-2 font-sans text-[0.8em] text-ink-2">{line.text}</p>;
          if (line.type === "chords")
            return <div key={index} className="whitespace-pre font-mono font-semibold text-accent">{line.row}</div>;
          return (
            <div key={index} className="mb-1 font-mono">
              {line.chordRow && <div className="whitespace-pre font-semibold text-accent">{line.chordRow}</div>}
              <div className="whitespace-pre">{line.textRow}</div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
