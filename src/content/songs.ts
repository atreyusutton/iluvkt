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
  tutorials: { youtubeId: string; title: string }[];
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
    "Capo on the 4th fret; all chord names are the shapes you finger. The progression follows the album-version tab; bar lengths are a best guess — compare with the tutorial and adjust in Sections. Start the play-along around 60 BPM and nudge it up a few BPM at a time once a section feels clean.",
  pickingPattern: TRAVIS_PATTERN,
  tutorials: [{ youtubeId: "NNVYwE-KGkQ", title: "Josh Turner lesson" }],
  chordSheet: `> Chords only for now. Click "Edit / paste lyrics" and paste a full chord tab — chord lines above lyric lines and [Verse 1] headings both work.
> Capo 4 — chord names are the shapes you finger. (Am Am7/G F) = three chords squeezed into the time of two.

[Intro]
C    G
(Am  Am7/G  F)
C    G    C

[Verse]
C    G    Am
F    C    G
C    G    Am
D7    G    G7
C    C7
F    D7
C    G    Am    F
C    G    C

[Interlude]
C    G    Am    F    C

[Outro]
C    G    Am    F    C
C    G    Am    D7    G    G7
C    C7    F    D7
C    G
(C  G  F)
C    G    C`,
  sections: [
    { name: "Intro", bars: [...bars("C", "G"), { chord: "Am", beats: 3 }, { chord: "Am7/G", beats: 1 }, { chord: "F", beats: 4 }, ...bars("C", "G", "C")] },
    {
      name: "Verse",
      bars: bars(
        "C", "G", "Am", "Am",
        "F", "F", "C", "G",
        "C", "G", "Am", "Am",
        "D7", "D7", "G", "G7",
        "C", "C", "C7", "C7",
        "F", "F", "D7", "D7",
        "C", "G", "Am", "F",
        "C", "G", "C", "C",
      ),
    },
    { name: "Interlude", bars: bars("C", "G", "Am", "F", "C") },
    {
      name: "Outro",
      bars: [
        ...bars("C", "G", "Am", "F", "C"),
        ...bars("C", "G", "Am", "D7", "G", "G7"),
        ...bars("C", "C7", "F", "D7"),
        ...bars("C", "G"),
        { chord: "C", beats: 3 }, { chord: "G", beats: 3 }, { chord: "F", beats: 2 },
        ...bars("C", "G", "C"),
      ],
    },
  ],
};
