import type { Bar } from "@/db/schema";
import { findChord } from "@/content/chords";

export type ChordPair = {
  /** Canonical `drillResults.key` for the pair. */
  key: string;
  first: string;
  second: string;
  /** How many times the song moves between these two chords. */
  count: number;
  /** Section names the change shows up in, in song order. */
  sections: string[];
};

/** The key a drill result is stored under. Alphabetised so A→B and B→A share a best score. */
export function pairKey(a: string, b: string) {
  const [first, second] = [a, b].sort();
  return `${first}→${second}`;
}

/**
 * Re-key a stored result. Scores saved before the key was alphabetised kept the
 * order they were drilled in ("G→Am"), so normalise on read rather than migrate.
 */
export function normalizePairKey(storedKey: string) {
  const [a, b] = storedKey.split("→");
  return b === undefined ? storedKey : pairKey(a, b);
}

/**
 * Every chord change the song actually asks for, as unordered pairs.
 *
 * Repeats of the same chord aren't a change, and we don't join across sections —
 * the last bar of the intro running into the first bar of the verse isn't a
 * transition you'd drill. Ordered by how often the change comes up.
 */
export function chordPairsFromSections(sections: { name: string; bars: Bar[] }[]): ChordPair[] {
  const pairs = new Map<string, ChordPair>();

  for (const section of sections) {
    let previous: string | null = null;
    for (const bar of section.bars) {
      const chord = bar.chord?.trim();
      if (!chord) continue;
      if (previous && previous !== chord) {
        const key = pairKey(previous, chord);
        let pair = pairs.get(key);
        if (!pair) {
          const [first, second] = [previous, chord].sort();
          pair = { key, first, second, count: 0, sections: [] };
          pairs.set(key, pair);
        }
        pair.count += 1;
        if (!pair.sections.includes(section.name)) pair.sections.push(section.name);
      }
      previous = chord;
    }
  }

  return [...pairs.values()].sort((a, b) => b.count - a.count || a.key.localeCompare(b.key));
}

/** Drop pairs we have no diagram for — the drill can't show them. */
export function playablePairs(pairs: ChordPair[]) {
  return pairs.filter((pair) => findChord(pair.first) && findChord(pair.second));
}
