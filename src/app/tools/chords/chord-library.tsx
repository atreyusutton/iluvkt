"use client";

import { useState } from "react";
import { ChordDiagram } from "@/components/chord-diagram";
import { Card, cn, Pill } from "@/components/ui";
import { CHORDS, type ChordShape } from "@/content/chords";

const SONG_CHORDS = new Set(["C", "G", "Am", "F", "D7", "G7", "C7"]);

const CATEGORIES: { value: ChordShape["category"] | "all" | "song"; label: string }[] = [
  { value: "all", label: "All" },
  { value: "song", label: "In Don't Think Twice" },
  { value: "major", label: "Major" },
  { value: "minor", label: "Minor" },
  { value: "seventh", label: "Seventh" },
  { value: "suspended", label: "Sus" },
  { value: "barre", label: "Barre" },
  { value: "other", label: "Other" },
];

export function ChordLibrary() {
  const [category, setCategory] = useState<(typeof CATEGORIES)[number]["value"]>("all");
  const [query, setQuery] = useState("");

  const visible = CHORDS.filter((chord) => {
    if (category === "song" && !SONG_CHORDS.has(chord.name)) return false;
    if (category !== "all" && category !== "song" && chord.category !== category) return false;
    return chord.name.toLowerCase().includes(query.trim().toLowerCase());
  });

  const jumpTo = (name: string) => {
    setCategory("all");
    setQuery("");
    requestAnimationFrame(() => document.getElementById(`chord-${name}`)?.scrollIntoView({ behavior: "smooth", block: "center" }));
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search chords, e.g. Am"
          className="field sm:max-w-xs"
          aria-label="Search chords"
        />
        <div className="flex flex-wrap gap-2">
          {CATEGORIES.map((item) => (
            <button
              key={item.value}
              onClick={() => setCategory(item.value)}
              className={cn(
                "rounded-full px-3 py-1.5 text-sm font-medium",
                category === item.value ? "bg-ink text-bg" : "bg-surface-2 text-ink-2 hover:text-ink",
              )}
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>

      {visible.length === 0 ? (
        <p className="text-sm text-ink-3">No chords match “{query}”.</p>
      ) : (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {visible.map((chord) => (
            <Card
              key={chord.name}
              id={`chord-${chord.name}`}
              className={cn("flex flex-col items-center gap-2 p-4 text-center", SONG_CHORDS.has(chord.name) && "border-rose/40")}
            >
              <ChordDiagram chord={chord} size={130} />
              <div className="flex flex-wrap justify-center gap-1">
                {SONG_CHORDS.has(chord.name) && <Pill tone="rose">in the song</Pill>}
                <Pill>{chord.category}</Pill>
              </div>
              {chord.tip && <p className="text-xs text-ink-2">{chord.tip}</p>}
              {chord.easier && (
                <button onClick={() => jumpTo(chord.easier!)} className="text-xs font-medium text-accent hover:underline">
                  Easier: {chord.easier} →
                </button>
              )}
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
