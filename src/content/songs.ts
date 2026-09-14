import type { Bar, PickingPattern } from "@/db/schema";

export type SongTemplate = {
  title: string;
  artist: string;
  capo: number;
  targetBpm: number;
  beatsPerBar: number;
  chordSheet: string;
  pickingPattern: PickingPattern;
  strummingPattern: string;
  notes: string;
  sections: { name: string; bars: Bar[] }[];
};

const bars = (...chords: string[]): Bar[] => chords.map((chord) => ({ chord, beats: 4 }));

/** Alternating-bass Travis pattern: thumb on every beat, fingers on the off-beats. */
export const TRAVIS_PATTERN: PickingPattern = {
  name: "Basic Travis picking",
  description:
    "Your thumb (T) alternates between the chord's root bass note and a second bass string on every beat. Your middle (M) and index (I) fingers fill in the off-beats. Beat 1 is a pinch — thumb and middle together.",
  steps: [
    { bass: "root", treble: [2] },
    { bass: null, treble: [] },
    { bass: "alt", treble: [] },
    { bass: null, treble: [3] },
    { bass: "root", treble: [] },
    { bass: null, treble: [2] },
    { bass: "alt", treble: [] },
    { bass: null, treble: [3] },
  ],
};

// Chords only. Lyrics are copyrighted, so the sheet is left for you to paste them in.
export const DONT_THINK_TWICE: SongTemplate = {
  title: "Don't Think Twice, It's All Right",
  artist: "Bob Dylan",
  capo: 4,
  targetBpm: 104,
  beatsPerBar: 4,
  strummingPattern: "Fingerpicked (Travis). Beginner fallback: D  D U  U D U",
  notes:
    "Capo on the 4th fret; all chord names are the shapes you finger. The progression here is a common arrangement — compare it with your tutorial and edit anything that differs. Start the play-along around 60 BPM and nudge it up a few BPM at a time once a section feels clean.",
  pickingPattern: TRAVIS_PATTERN,
  chordSheet: `> Chords only for now. Paste the lyrics (official ones are on bobdylan.com) and put each chord in [brackets] right before the syllable it lands on, e.g. [C]your lyric [G]here.
> Capo 4 — chord names are the shapes you finger.

# Intro
[C]    [G]    [Am]    [F]
[C]    [G]    [C]    [G]

# Verse
[C]    [G]    [Am]
[F]    [C]    [G]
[C]    [G]    [Am]
[D7]    [G]    [G7]
[C]    [C7]    [F]    [D7]
[C]    [G]    [Am]    [F]
[C]    [G]    [C]    [G]

# Instrumental (between verses)
[C]    [G]    [Am]    [F]
[C]    [G]    [C]    [G]`,
  sections: [
    { name: "Intro", bars: bars("C", "G", "Am", "F", "C", "G", "C", "G") },
    {
      name: "Verse",
      bars: bars(
        "C", "G", "Am", "Am",
        "F", "F", "C", "G",
        "C", "G", "Am", "Am",
        "D7", "D7", "G", "G7",
        "C", "C7", "F", "D7",
        "C", "G", "Am", "F",
        "C", "G", "C", "G",
      ),
    },
    { name: "Instrumental", bars: bars("C", "G", "Am", "F", "C", "G", "C", "G") },
  ],
};
