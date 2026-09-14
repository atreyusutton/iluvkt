export type Lesson = {
  slug: string;
  title: string;
  minutes: number;
  summary: string;
  steps: string[];
  practice: string;
  chords?: string[];
  tool?: { label: string; href: string };
  youtubeSearch: string;
};

export type LessonModule = { slug: string; title: string; description: string; lessons: Lesson[] };

export const MODULES: LessonModule[] = [
  {
    slug: "foundations",
    title: "1 · Foundations",
    description: "Set up, get in tune, and learn how to read what's on the page.",
    lessons: [
      {
        slug: "holding-the-guitar",
        title: "Holding the guitar",
        minutes: 10,
        summary: "A relaxed posture makes everything else easier and saves your wrist.",
        steps: [
          "Sit upright with the guitar's waist resting on your right leg (left leg if you play left-handed).",
          "Tilt the neck up slightly — the headstock around shoulder height.",
          "Let your picking forearm rest on the upper edge of the body so your hand hovers over the sound hole.",
          "Keep your fretting wrist straight-ish and your thumb loose behind the neck. No death grip.",
        ],
        practice: "Sit with the guitar for two minutes, shaking out tension every 30 seconds. Notice where you clench.",
        youtubeSearch: "how to hold an acoustic guitar beginner",
      },
      {
        slug: "tuning",
        title: "Tuning your guitar",
        minutes: 10,
        summary: "Out-of-tune practice trains your ears wrong. Tune at the start of every session.",
        steps: [
          "Standard tuning from thickest to thinnest string: E A D G B E.",
          "Open the tuner and pluck one string at a time, letting it ring.",
          "Always tune up to the note: if you're sharp, drop below and come back up. It holds better.",
          "After putting on a capo, check the tuning again — capos can pull strings sharp.",
        ],
        practice: "Detune one string on purpose, then bring it back using only the tuner. Repeat for each string.",
        tool: { label: "Open the tuner", href: "/tools/tuner" },
        youtubeSearch: "how to tune a guitar with a tuner beginner",
      },
      {
        slug: "reading-diagrams-and-tab",
        title: "Reading chord diagrams & tab",
        minutes: 10,
        summary: "Chord boxes show where fingers go; tab shows which fret on which string, in order.",
        steps: [
          "Chord diagrams: vertical lines are strings (low E on the left), horizontal lines are frets.",
          "Numbers in dots are fingers: 1 index, 2 middle, 3 ring, 4 pinky. X = don't play, O = open string.",
          "Tab: six lines are strings with high e on top. Numbers are frets; read left to right.",
          "Stacked numbers in tab are played together (a pinch when fingerpicking).",
        ],
        practice: "Open the chord library and say each finger placement out loud for C, G and Am before you fret them.",
        tool: { label: "Chord library", href: "/tools/chords" },
        youtubeSearch: "how to read guitar chord diagrams and tabs",
      },
    ],
  },
  {
    slug: "first-chords",
    title: "2 · Your first chords",
    description: "Every chord you need for Don't Think Twice — and clean changes between them.",
    lessons: [
      {
        slug: "em-am-c",
        title: "Em, Am and C",
        minutes: 20,
        summary: "Three shapes that share finger positions, so they connect nicely.",
        steps: [
          "Fret each chord, then pick every string one at a time. Fix any that buzz or are muted.",
          "Press just behind the fret wire, not on top of it — less pressure, cleaner tone.",
          "Notice Am and C share fingers 1 and 2; only finger 3 moves.",
        ],
        practice: "Pluck-check each chord 5 times, then do one-minute changes between Am and C.",
        chords: ["Em", "Am", "C"],
        tool: { label: "Chord-change drill", href: "/tools/chord-changes" },
        youtubeSearch: "beginner guitar Em Am C chords",
      },
      {
        slug: "g-and-sevenths",
        title: "G, G7, C7 and D7",
        minutes: 20,
        summary: "The 'seventh' chords give Dylan's progression its pull back home.",
        steps: [
          "Learn G with fingers 2-1-3. Moving to G7 is a quick jump for your pinky side of the hand.",
          "C7 is a C chord with your pinky added on the 3rd string.",
          "D7 is a small triangle shape on the top three strings — only pick from the 4th string down.",
        ],
        practice: "Loop the Verse line 'D7 → G → G7 → C' slowly with the metronome at 60.",
        chords: ["G", "G7", "C7", "D7"],
        tool: { label: "Metronome", href: "/tools/metronome" },
        youtubeSearch: "how to play G7 C7 D7 guitar chords beginner",
      },
      {
        slug: "the-f-chord",
        title: "Taming the F chord",
        minutes: 20,
        summary: "The classic beginner wall. Use Fmaj7 now, build toward full F over a few weeks.",
        steps: [
          "Start with Fmaj7 (xx3210) — it sounds great in this song.",
          "Then try the small F (xx3211): flatten your index to cover the top two strings at fret 1.",
          "When that's comfortable, work on the full barre F a couple of minutes per session — don't grind.",
          "If your hand hurts (not just tired), stop and shake out.",
        ],
        practice: "One-minute changes C ↔ Fmaj7 every day this week. Track your score.",
        chords: ["Fmaj7", "Fsmall", "F"],
        tool: { label: "Chord-change drill", href: "/tools/chord-changes" },
        youtubeSearch: "easy F chord guitar beginner Fmaj7",
      },
      {
        slug: "one-minute-changes",
        title: "One-minute changes",
        minutes: 10,
        summary: "The fastest-known way to get smooth chord switches: count clean changes in 60 seconds.",
        steps: [
          "Pick two chords. Strum once, switch, strum once, switch — for 60 seconds.",
          "Only count changes where every string rings.",
          "Write down the number. Aim for 30+, then 60 (one per second).",
          "Focus on your hardest pairs from the song: C–G, Am–F, D7–G.",
        ],
        practice: "Do 2–3 pairs at the start of every session and let the app track your best scores.",
        tool: { label: "Start a drill", href: "/tools/chord-changes" },
        youtubeSearch: "one minute chord changes guitar exercise",
      },
    ],
  },
  {
    slug: "rhythm",
    title: "3 · Rhythm & timing",
    description: "Keeping steady time matters more than playing fast.",
    lessons: [
      {
        slug: "counting-and-metronome",
        title: "Counting & the metronome",
        minutes: 15,
        summary: "Counting '1 & 2 & 3 & 4 &' out loud locks you into the beat.",
        steps: [
          "Set the metronome to 60 and clap on each click while counting 1-2-3-4.",
          "Now count the '&' between clicks too — those are the eighth notes your fingers will hit.",
          "Strum a C chord down on every click, never stopping even if a chord is messy.",
        ],
        practice: "Two minutes of down-strums on the click, switching chord every 4 beats.",
        tool: { label: "Metronome", href: "/tools/metronome" },
        youtubeSearch: "guitar practice with metronome beginner counting",
      },
      {
        slug: "basic-strumming",
        title: "A basic strumming pattern",
        minutes: 15,
        summary: "A fallback strum lets you play the whole song before your picking is ready.",
        steps: [
          "Pattern: D  D U  U D U (down, down-up, up-down-up).",
          "Keep your hand moving down-up constantly; just miss the strings on the silent strokes.",
          "Relax your wrist — strum from the wrist, not the elbow.",
        ],
        practice: "Strum the Intro progression with this pattern at 70 BPM.",
        youtubeSearch: "D DU UDU strumming pattern beginner",
      },
    ],
  },
  {
    slug: "fingerpicking",
    title: "4 · Travis picking",
    description: "The alternating-bass fingerstyle that makes Don't Think Twice sound like the record.",
    lessons: [
      {
        slug: "thumb-independence",
        title: "Thumb independence",
        minutes: 20,
        summary: "Your thumb is the drummer. It must keep going no matter what your fingers do.",
        steps: [
          "Fret a C chord. Thumb only: 5th string, 4th string, 5th string, 4th string — steady on each beat.",
          "On G, the thumb alternates between the 6th and 4th strings.",
          "Keep it going with the metronome at 60 until you can think about something else while doing it.",
        ],
        practice: "Three minutes of thumb-only alternating bass, switching C ↔ G every bar.",
        chords: ["C", "G"],
        tool: { label: "Metronome", href: "/tools/metronome" },
        youtubeSearch: "travis picking thumb alternating bass exercise",
      },
      {
        slug: "adding-fingers",
        title: "Adding the fingers",
        minutes: 20,
        summary: "Fingers fill in the off-beats between thumb notes.",
        steps: [
          "Middle finger on the 2nd string, index on the 3rd.",
          "Add one finger note at a time: thumb, thumb-index, thumb, thumb-middle...",
          "Then the pinch: thumb and middle together on beat 1.",
          "Say it out loud: 'PINCH – thumb – index – thumb – middle – thumb – index'.",
        ],
        practice: "Loop the pattern on a single C chord for 3 minutes. Speed doesn't matter yet.",
        chords: ["C"],
        youtubeSearch: "travis picking pattern beginner lesson pinch",
      },
      {
        slug: "picking-through-changes",
        title: "Picking through chord changes",
        minutes: 25,
        summary: "The real challenge: keeping the pattern alive while your fretting hand moves.",
        steps: [
          "Remember each chord's bass strings: C = 5 & 4, G = 6 & 4, Am = 5 & 4, D7 = 4 & 5.",
          "Change chords on beat 1. If you're late, it's fine to pinch an open string while you land.",
          "Use the song's play-along at a slow tempo; watch the highlighted bass string per chord.",
        ],
        practice: "Play the Intro section in the play-along at 60 BPM until you get through it three times clean.",
        chords: ["C", "G", "Am", "D7"],
        tool: { label: "Open songs", href: "/songs" },
        youtubeSearch: "don't think twice it's all right guitar lesson travis picking",
      },
    ],
  },
  {
    slug: "songs",
    title: "5 · Playing the song",
    description: "Putting it together — and getting ready to play it for someone you love.",
    lessons: [
      {
        slug: "using-a-capo",
        title: "Using a capo",
        minutes: 10,
        summary: "A capo raises every chord shape to a new key without learning new shapes.",
        steps: [
          "Clamp the capo just behind the 4th fret, straight across.",
          "Chord names on the sheet are shapes relative to the capo — a 'C' shape now sounds as E.",
          "Retune after clamping; check the high e and B strings especially.",
        ],
        practice: "Play C–G–Am–F with the capo on, then compare against the recording in your tutorial.",
        tool: { label: "Tuner", href: "/tools/tuner" },
        youtubeSearch: "how to use a capo guitar beginner",
      },
      {
        slug: "learning-in-sections",
        title: "Learning a song in sections",
        minutes: 15,
        summary: "Break the song into chunks, nail each one, then stitch them together.",
        steps: [
          "Mark each section's status on the song page: learning → okay → nailed.",
          "Work on the hardest section first while you're fresh.",
          "Once a section is clean at a tempo 3 times in a row, raise it by 4–5 BPM.",
          "Record yourself weekly — you'll hear progress you can't feel.",
        ],
        practice: "Pick one section, set the play-along to a slow tempo, and play it five times through.",
        tool: { label: "Recordings", href: "/recordings" },
        youtubeSearch: "how to learn a song on guitar practice sections",
      },
      {
        slug: "performing",
        title: "Playing it for someone",
        minutes: 10,
        summary: "Nerves make you rush and grip. Rehearse the performance, not just the song.",
        steps: [
          "Do full run-throughs from start to finish without stopping — even when you mess up.",
          "Practice recovering: if you drop a chord, keep the thumb going and rejoin on the next bar.",
          "Play for a recording as if it's the real thing. Then play it for a friend or pet.",
          "Pick a slightly slower tempo than your max. Relaxed sounds better than fast.",
        ],
        practice: "Set your performance date in Settings and do one no-stopping run-through each session this week.",
        tool: { label: "Settings", href: "/settings" },
        youtubeSearch: "overcoming nerves playing guitar for someone",
      },
    ],
  },
];

export const ALL_LESSONS = MODULES.flatMap((lessonModule) => lessonModule.lessons);

export function findLesson(slug: string) {
  for (const lessonModule of MODULES) {
    const lesson = lessonModule.lessons.find((item) => item.slug === slug);
    if (lesson) return { module: lessonModule, lesson };
  }
  return undefined;
}
