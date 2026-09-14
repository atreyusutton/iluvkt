/**
 * Chord shapes. `frets` and `fingers` run from string 6 (low E) to string 1 (high E).
 * -1 = muted, 0 = open. Fingers: 0 = none, 1 index, 2 middle, 3 ring, 4 pinky.
 * `root`/`alt` are the string numbers the thumb alternates between when fingerpicking.
 */
export type ChordShape = {
  name: string;
  frets: number[];
  fingers: number[];
  barre?: { fret: number; fromString: number; toString: number };
  root: number;
  alt: number;
  category: "major" | "minor" | "seventh" | "suspended" | "barre" | "other";
  tip?: string;
  easier?: string;
};

export const CHORDS: ChordShape[] = [
  { name: "C", frets: [-1, 3, 2, 0, 1, 0], fingers: [0, 3, 2, 0, 1, 0], root: 5, alt: 4, category: "major", tip: "Arch your fingers so the open G and high E ring clearly." },
  { name: "D", frets: [-1, -1, 0, 2, 3, 2], fingers: [0, 0, 0, 1, 3, 2], root: 4, alt: 5, category: "major", tip: "Only strum the top four strings." },
  { name: "E", frets: [0, 2, 2, 1, 0, 0], fingers: [0, 2, 3, 1, 0, 0], root: 6, alt: 4, category: "major" },
  { name: "F", frets: [1, 3, 3, 2, 1, 1], fingers: [1, 3, 4, 2, 1, 1], barre: { fret: 1, fromString: 6, toString: 1 }, root: 6, alt: 4, category: "barre", tip: "Roll your index finger slightly onto its bony edge for the barre.", easier: "Fmaj7" },
  { name: "Fsmall", frets: [-1, -1, 3, 2, 1, 1], fingers: [0, 0, 3, 2, 1, 1], barre: { fret: 1, fromString: 2, toString: 1 }, root: 4, alt: 3, category: "major", tip: "A mini-barre on the top two strings — a stepping stone to full F." },
  { name: "G", frets: [3, 2, 0, 0, 0, 3], fingers: [2, 1, 0, 0, 0, 3], root: 6, alt: 4, category: "major" },
  { name: "A", frets: [-1, 0, 2, 2, 2, 0], fingers: [0, 0, 1, 2, 3, 0], root: 5, alt: 4, category: "major" },
  { name: "Bb", frets: [-1, 1, 3, 3, 3, 1], fingers: [0, 1, 2, 3, 4, 1], barre: { fret: 1, fromString: 5, toString: 1 }, root: 5, alt: 4, category: "barre" },
  { name: "Am", frets: [-1, 0, 2, 2, 1, 0], fingers: [0, 0, 2, 3, 1, 0], root: 5, alt: 4, category: "minor", tip: "Same shape as E, moved over one string." },
  { name: "Dm", frets: [-1, -1, 0, 2, 3, 1], fingers: [0, 0, 0, 2, 3, 1], root: 4, alt: 5, category: "minor" },
  { name: "Em", frets: [0, 2, 2, 0, 0, 0], fingers: [0, 2, 3, 0, 0, 0], root: 6, alt: 4, category: "minor", tip: "The easiest chord there is — strum all six strings." },
  { name: "Bm", frets: [-1, 2, 4, 4, 3, 2], fingers: [0, 1, 3, 4, 2, 1], barre: { fret: 2, fromString: 5, toString: 1 }, root: 5, alt: 4, category: "barre" },
  { name: "F#m", frets: [2, 4, 4, 2, 2, 2], fingers: [1, 3, 4, 1, 1, 1], barre: { fret: 2, fromString: 6, toString: 1 }, root: 6, alt: 4, category: "barre" },
  { name: "C7", frets: [-1, 3, 2, 3, 1, 0], fingers: [0, 3, 2, 4, 1, 0], root: 5, alt: 4, category: "seventh", tip: "Just add your pinky to a C chord." },
  { name: "D7", frets: [-1, -1, 0, 2, 1, 2], fingers: [0, 0, 0, 2, 1, 3], root: 4, alt: 5, category: "seventh" },
  { name: "E7", frets: [0, 2, 0, 1, 0, 0], fingers: [0, 2, 0, 1, 0, 0], root: 6, alt: 4, category: "seventh" },
  { name: "G7", frets: [3, 2, 0, 0, 0, 1], fingers: [3, 2, 0, 0, 0, 1], root: 6, alt: 4, category: "seventh" },
  { name: "A7", frets: [-1, 0, 2, 0, 2, 0], fingers: [0, 0, 2, 0, 3, 0], root: 5, alt: 4, category: "seventh" },
  { name: "B7", frets: [-1, 2, 1, 2, 0, 2], fingers: [0, 2, 1, 3, 0, 4], root: 5, alt: 4, category: "seventh" },
  { name: "Cmaj7", frets: [-1, 3, 2, 0, 0, 0], fingers: [0, 3, 2, 0, 0, 0], root: 5, alt: 4, category: "other" },
  { name: "Fmaj7", frets: [-1, -1, 3, 2, 1, 0], fingers: [0, 0, 3, 2, 1, 0], root: 4, alt: 3, category: "other", tip: "The beginner-friendly stand-in for F." },
  { name: "Am7", frets: [-1, 0, 2, 0, 1, 0], fingers: [0, 0, 2, 0, 1, 0], root: 5, alt: 4, category: "other" },
  { name: "Em7", frets: [0, 2, 2, 0, 3, 0], fingers: [0, 1, 2, 0, 3, 0], root: 6, alt: 4, category: "other" },
  { name: "Dm7", frets: [-1, -1, 0, 2, 1, 1], fingers: [0, 0, 0, 2, 1, 1], root: 4, alt: 5, category: "other" },
  { name: "Cadd9", frets: [-1, 3, 2, 0, 3, 3], fingers: [0, 2, 1, 0, 3, 4], root: 5, alt: 4, category: "other" },
  { name: "Dsus2", frets: [-1, -1, 0, 2, 3, 0], fingers: [0, 0, 0, 1, 2, 0], root: 4, alt: 5, category: "suspended" },
  { name: "Dsus4", frets: [-1, -1, 0, 2, 3, 3], fingers: [0, 0, 0, 1, 2, 3], root: 4, alt: 5, category: "suspended" },
  { name: "Asus2", frets: [-1, 0, 2, 2, 0, 0], fingers: [0, 0, 1, 2, 0, 0], root: 5, alt: 4, category: "suspended" },
  { name: "Asus4", frets: [-1, 0, 2, 2, 3, 0], fingers: [0, 0, 1, 2, 3, 0], root: 5, alt: 4, category: "suspended" },
];

const byName = new Map(CHORDS.map((chord) => [chord.name.toLowerCase(), chord]));

export function findChord(name: string): ChordShape | undefined {
  return byName.get(name.trim().toLowerCase());
}

/** Tab for one pass of a picking pattern over a chord: one row per string (1..6), one column per step. */
export function patternToTab(
  chord: ChordShape,
  steps: { bass: "root" | "alt" | null; treble: number[] }[],
): string[][] {
  const rows: string[][] = Array.from({ length: 6 }, () => steps.map(() => "-"));
  steps.forEach((step, column) => {
    const strings = [...step.treble];
    if (step.bass) strings.push(step.bass === "root" ? chord.root : chord.alt);
    for (const stringNumber of strings) {
      const fret = chord.frets[6 - stringNumber];
      rows[stringNumber - 1][column] = fret < 0 ? "x" : String(fret);
    }
  });
  return rows;
}

export const STRING_NAMES = ["e", "B", "G", "D", "A", "E"];
