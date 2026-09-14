import "server-only";
import { mkdir, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { eq } from "drizzle-orm";
import { getDb } from "@/db";
import {
  drillResults,
  lessonProgress,
  practiceSessions,
  recordings,
  settings,
  songSections,
  songs,
  type JournalEntry,
  type SongSection,
} from "@/db/schema";
import { localRecordingFilename, LOCAL_RECORDINGS_DIR } from "@/lib/storage";
import { addDays, dayKey } from "@/lib/time";
import { renderPractice, wavDurationSeconds } from "./synth";

type Drill = { type: "chord-change" | "fretboard"; key: string; score: number };

type DemoDay = {
  offset: number;
  minutes: number;
  hour: number;
  focus: string[];
  sections: string[];
  bpm: number | null;
  rating: number;
  notes: string;
  lessons?: string[];
  drills?: Drill[];
  recording?: { label: string; sections: string[]; bars?: number; bpm: number; sloppiness: number };
  journal: JournalEntry;
  extra?: Omit<DemoDay, "offset" | "extra" | "hour"> & { hour: number };
};

// Two weeks of believable practice, ending today. Day -10 was skipped.
const DAYS: DemoDay[] = [
  {
    offset: -13, minutes: 26, hour: 19, focus: ["Tuning", "Warm-up", "Lesson", "Chord changes"], sections: [], bpm: null, rating: 3,
    notes: "First real session with the guitar. Tuned up with the app and learned how to hold it without tensing up. C to G is slow — my ring finger keeps landing late.",
    lessons: ["holding-the-guitar", "tuning"],
    drills: [{ type: "chord-change", key: "C→G", score: 12 }],
    journal: {
      title: "Day one: tuned up and holding it right",
      whatIPracticed: "I tuned the guitar, worked on a relaxed posture, and tried my first one-minute chord changes between C and G.",
      progress: "A 26-minute first session is a great start. Your 12 clean C→G changes give you a baseline to beat — most beginners start between 8 and 15.",
      wins: ["Tuned all six strings on my own", "Got through a full minute of C→G changes"],
      focusNext: ["Place the ring finger first when switching to G", "Keep your thumb loose behind the neck"],
      encouragement: "Every song you'll ever play starts with a day like this one.",
    },
  },
  {
    offset: -12, minutes: 31, hour: 20, focus: ["Lesson", "Chord changes"], sections: [], bpm: null, rating: 3,
    notes: "Learned to read chord boxes and tab. Pluck-checked Em, Am and C. Tried F and it was ugly, so I used the Fmaj7 shape. Fingertips are sore.",
    lessons: ["reading-diagrams-and-tab", "em-am-c"],
    drills: [{ type: "chord-change", key: "C→G", score: 15 }, { type: "chord-change", key: "Am→F", score: 6 }],
    journal: {
      title: "Reading tab and meeting the F chord",
      whatIPracticed: "I learned to read chord diagrams and tab, pluck-checked Em, Am and C, and started one-minute changes on Am→F using the Fmaj7 shape.",
      progress: "You hit your 30-minute goal for the first time. C→G went from 12 to 15 in a day, which is exactly the kind of jump early drills produce.",
      wins: ["First full 30-minute day", "C→G up to 15"],
      focusNext: ["Keep Am→F on the easy Fmaj7 shape for now", "Pluck each string of C to find any buzzing"],
      encouragement: "Sore fingertips mean calluses are on the way — that's progress you can feel.",
    },
  },
  {
    offset: -11, minutes: 34, hour: 19, focus: ["Warm-up", "Chord changes", "Lesson"], sections: [], bpm: null, rating: 4,
    notes: "G7, C7 and D7 are easier than I expected. D7 to G feels like the song already.",
    lessons: ["g-and-sevenths"],
    drills: [{ type: "chord-change", key: "C→G", score: 18 }, { type: "chord-change", key: "D7→G", score: 10 }],
    journal: {
      title: "The seventh chords click",
      whatIPracticed: "I learned G7, C7 and D7 and drilled D7→G for the first time, plus another round of C→G.",
      progress: "Three days in a row and C→G is now at 18 — up 50% from day one. You now know every chord shape the song uses.",
      wins: ["Learned three new chords in one session", "C→G up to 18"],
      focusNext: ["Loop D7 → G → G7 → C slowly with the metronome at 60", "Start the one-minute-changes lesson"],
      encouragement: "Hearing the song start to appear under your fingers is the best motivation there is.",
    },
  },
  {
    offset: -9, minutes: 30, hour: 21, focus: ["Chord changes", "Lesson"], sections: [], bpm: null, rating: 2,
    notes: "Missed yesterday. F chord day — frustrating. Full barre F barely rings. Went back to Fmaj7 and did changes instead of fighting it.",
    lessons: ["the-f-chord", "one-minute-changes"],
    drills: [{ type: "chord-change", key: "C→G", score: 20 }, { type: "chord-change", key: "Am→F", score: 9 }, { type: "chord-change", key: "D7→G", score: 13 }],
    journal: {
      title: "A tough F-chord day, still showed up",
      whatIPracticed: "I worked through the F chord lesson, tried the full barre, and switched to Fmaj7 for one-minute changes on three pairs.",
      progress: "You came back after a missed day and still hit 30 minutes. Even on a frustrating day, all three drill scores went up — C→G reached 20.",
      wins: ["Didn't let a missed day turn into two", "Am→F improved to 9 with Fmaj7"],
      focusNext: ["Only 2 minutes on full barre F per session — don't grind", "Start thumb independence: alternating bass on C"],
      encouragement: "The days you practice when it's hard are the ones that build the habit.",
    },
  },
  {
    offset: -8, minutes: 33, hour: 19, focus: ["Warm-up", "Picking pattern", "Recording"], sections: ["Intro"], bpm: 50, rating: 3,
    notes: "Started Travis picking. Thumb alone is fine but adding fingers falls apart. Recorded a very rough intro at 50 so I can compare later.",
    lessons: ["thumb-independence"],
    drills: [{ type: "chord-change", key: "C→G", score: 22 }],
    recording: { label: "Intro first try at 50 BPM", sections: ["Intro"], bpm: 50, sloppiness: 0.9 },
    journal: {
      title: "First Travis picking and a baseline recording",
      whatIPracticed: "I practiced alternating thumb bass on C and G, tried the full intro pattern at 50 BPM, and recorded my first take.",
      progress: "This recording is your 'before' — it will be fun to compare in a couple of weeks. C→G is up to 22, so your fretting hand is ready for the picking to catch up.",
      wins: ["First recording saved", "Thumb keeps a steady bass on its own"],
      focusNext: ["Thumb-only alternating bass for 3 minutes before adding fingers", "Say the pattern out loud: pinch, thumb, index, thumb…"],
      encouragement: "Recording yourself this early takes guts — future you will thank you.",
    },
  },
  {
    offset: -7, minutes: 36, hour: 20, focus: ["Picking pattern", "Chord changes"], sections: ["Intro"], bpm: 54, rating: 4,
    notes: "The pinch finally clicked! Thumb and middle together on beat one. Can loop the pattern on C without thinking.",
    lessons: ["counting-and-metronome", "adding-fingers"],
    drills: [{ type: "chord-change", key: "Am→F", score: 12 }, { type: "chord-change", key: "D7→G", score: 16 }],
    journal: {
      title: "The pinch clicks",
      whatIPracticed: "I learned to count eighth notes with the metronome, added my fingers to the Travis pattern, and got the pinch working on C.",
      progress: "Your longest session so far at 36 minutes. The Intro play-along moved from 50 to 54 BPM, and Am→F climbed to 12.",
      wins: ["Pinch on beat one feels natural", "Looped the pattern on C without stopping"],
      focusNext: ["Keep the pattern going through a C → G change", "Push the Intro to 58 BPM only when 54 is clean three times"],
      encouragement: "That moment when a pattern goes automatic is what learning guitar feels like.",
    },
  },
  {
    offset: -6, minutes: 30, hour: 19, focus: ["Picking pattern", "Song sections"], sections: ["Intro"], bpm: 58, rating: 3,
    notes: "Intro at 58. The Am7/G passing chord is awkward — skipping the A string is hard.",
    drills: [{ type: "chord-change", key: "C→G", score: 25 }],
    journal: {
      title: "Wrestling with Am7/G",
      whatIPracticed: "I played the Intro in the play-along at 58 BPM and focused on the quick Am → Am7/G → F move.",
      progress: "One week of practice and you're at 58 BPM on the Intro with C→G at 25 changes per minute. Steady, consistent gains.",
      wins: ["Intro up to 58 BPM", "C→G at 25"],
      focusNext: ["Practice Am → Am7/G slowly on its own: just move the ring finger to the low E", "Mute the A string with the side of your ring finger"],
      encouragement: "Passing chords are a small detail that makes the song sound like the record.",
    },
    extra: {
      minutes: 12, hour: 22, focus: ["Chord changes"], sections: [], bpm: null, rating: 4,
      notes: "Quick extra practice on the couch before bed — just chord changes while watching TV.",
      journal: {
        title: "Bonus couch practice",
        whatIPracticed: "I did 12 extra minutes of relaxed chord changes before bed.",
        progress: "Extra casual practice like this adds up fast — it pushed today to 42 minutes, your biggest day yet.",
        wins: ["Picked up the guitar a second time today"],
        focusNext: ["Keep the guitar out of its case so it's easy to grab"],
        encouragement: "Playing for fun is still practice.",
      },
    },
  },
  {
    offset: -5, minutes: 40, hour: 19, focus: ["Picking pattern", "Song sections", "Recording"], sections: ["Intro"], bpm: 60, rating: 4,
    notes: "Played the whole intro at 60 without stopping twice in a row! Marked it okay. Recorded it — much better than last week.",
    lessons: ["picking-through-changes"],
    drills: [{ type: "chord-change", key: "Am→F", score: 14 }, { type: "chord-change", key: "D7→G", score: 19 }],
    recording: { label: "Intro at 60 BPM", sections: ["Intro"], bpm: 60, sloppiness: 0.55 },
    journal: {
      title: "The Intro holds together at 60",
      whatIPracticed: "I worked on keeping the Travis pattern going through chord changes and played the full Intro at 60 BPM, then recorded it.",
      progress: "Compare this take to your 50 BPM one from three days ago — fewer dropped notes and much steadier timing. The Intro is now marked 'okay'.",
      wins: ["Two clean Intro run-throughs in a row", "Second recording, clearly better than the first"],
      focusNext: ["Start the Verse at 56–60 BPM", "Keep Am→F drills going; it's still your slowest pair at 14"],
      encouragement: "You can hear your progress now, not just feel it.",
    },
  },
  {
    offset: -4, minutes: 31, hour: 20, focus: ["Tuning", "Song sections"], sections: ["Intro", "Verse"], bpm: 64, rating: 3,
    notes: "Learned more about the capo — retuning after putting it on made a big difference. Started the verse, it's long.",
    lessons: ["using-a-capo"],
    drills: [{ type: "chord-change", key: "C→G", score: 27 }, { type: "fretboard", key: "low-5", score: 8 }],
    journal: {
      title: "Capo on, verse started",
      whatIPracticed: "I retuned with the capo on the 4th fret, pushed the Intro to 64 BPM, and started learning the Verse progression.",
      progress: "The Intro keeps climbing (64 BPM). Starting the Verse is a big milestone — it's 32 bars, so learning it in chunks will pay off.",
      wins: ["Intro at 64 BPM", "First fretboard trainer round: 8 notes"],
      focusNext: ["Split the Verse into 4-bar chunks", "The C → C7 → F → D7 line is the trickiest part — loop it alone"],
      encouragement: "Retuning after the capo is a pro habit already.",
    },
  },
  {
    offset: -3, minutes: 45, hour: 19, focus: ["Song sections", "Picking pattern", "Chord changes"], sections: ["Verse", "Interlude"], bpm: 68, rating: 4,
    notes: "Long session. Verse at 66, the interlude at 68. The C7 to F change is getting smoother.",
    lessons: ["learning-in-sections"],
    drills: [{ type: "chord-change", key: "Am→F", score: 17 }, { type: "chord-change", key: "D7→G", score: 22 }, { type: "chord-change", key: "C→G", score: 29 }],
    journal: {
      title: "Longest session yet: Verse and Interlude",
      whatIPracticed: "I spent 45 minutes on the Verse at 66 BPM and the Interlude at 68, plus three rounds of chord changes.",
      progress: "Your biggest single session. C→G is at 29, almost the 30 milestone, and Am→F nearly tripled from its first score of 6 to 17.",
      wins: ["45-minute session", "C→G at 29 — one away from 30"],
      focusNext: ["Break 30 on C→G", "Record the Verse once it's steady at 70"],
      encouragement: "Six days in a row — this is officially a habit.",
    },
  },
  {
    offset: -2, minutes: 33, hour: 20, focus: ["Song sections", "Recording"], sections: ["Intro", "Verse"], bpm: 72, rating: 4,
    notes: "Verse at 72 and the intro at 76. Recorded the first part of the verse. Sounds like actual music.",
    drills: [{ type: "fretboard", key: "low-5", score: 11 }, { type: "chord-change", key: "Am→F", score: 19 }],
    recording: { label: "Verse at 72 BPM", sections: ["Verse"], bars: 12, bpm: 72, sloppiness: 0.35 },
    journal: {
      title: "It sounds like music now",
      whatIPracticed: "I pushed the Intro to 76 BPM and the Verse to 72, then recorded the first part of the Verse.",
      progress: "Twelve days in, the Intro is at 76 of the 104 BPM target — nearly three-quarters of the way. This recording is noticeably tighter than your 60 BPM Intro take.",
      wins: ["Intro at 76 BPM", "Verse recording with steady bass"],
      focusNext: ["Nail the D7 → G → G7 turnaround at 72", "Try the full Intro → Verse transition without stopping"],
      encouragement: "The song is really taking shape.",
    },
  },
  {
    offset: -1, minutes: 20, hour: 22, focus: ["Chord changes", "Warm-up"], sections: [], bpm: null, rating: 3,
    notes: "Only 20 minutes, long day. Did drills only. Finally broke 30 on C to G.",
    drills: [{ type: "chord-change", key: "C→G", score: 31 }, { type: "chord-change", key: "Am→F", score: 21 }, { type: "chord-change", key: "D7→G", score: 25 }],
    journal: {
      title: "Short day, big drill milestone",
      whatIPracticed: "I only had 20 minutes, so I warmed up and ran chord-change drills on my three main pairs.",
      progress: "Short sessions still keep the streak alive, and this one broke 30 on C→G (31). Am→F has more than tripled since your first try.",
      wins: ["C→G at 31 — 'Smooth changer' milestone", "Kept the streak going on a busy day"],
      focusNext: ["Get back to 30+ minutes tomorrow", "Do a full no-stopping run-through"],
      encouragement: "Twenty focused minutes beats zero every time.",
    },
  },
  {
    offset: 0, minutes: 34, hour: 17, focus: ["Full run-through", "Song sections", "Recording"], sections: ["Intro", "Verse", "Interlude", "Outro"], bpm: 76, rating: 5,
    notes: "Best day yet. Intro nailed at 84. Played intro into the first verse at 76 without stopping and recorded it. Started looking at the outro.",
    lessons: ["performing"],
    drills: [{ type: "chord-change", key: "C→G", score: 33 }, { type: "chord-change", key: "D7→G", score: 28 }, { type: "fretboard", key: "low-5", score: 14 }],
    recording: { label: "Intro into verse run-through at 76 BPM", sections: ["Intro", "Verse"], bars: 20, bpm: 76, sloppiness: 0.18 },
    journal: {
      title: "Intro nailed, first real run-through",
      whatIPracticed: "I marked the Intro as nailed at 84 BPM, played the Intro straight into the Verse at 76 without stopping, recorded it, and took a first look at the Outro.",
      progress: "Two weeks in: over 7 hours of practice, a 10-day streak, and your Intro is at 84 of 104 BPM. Listen to today's take next to your 50 BPM recording from day 6 — the difference is huge.",
      wins: ["Intro marked nailed at 84 BPM", "First no-stopping Intro → Verse run-through", "C→G at 33"],
      focusNext: ["Get the Verse from 76 to 84 over the next few days", "Learn the Outro in two chunks", "Keep one full run-through per session"],
      encouragement: "At this pace you'll be playing the whole song for her well before Christmas.",
    },
  },
];

const FINAL_SECTIONS: Record<string, Pick<SongSection, "status" | "bestBpm" | "notes">> = {
  Intro: { status: "nailed", bestBpm: 84, notes: "Mute the A string on Am7/G." },
  Verse: { status: "okay", bestBpm: 76, notes: "C → C7 → F → D7 line needs the most work." },
  Interlude: { status: "okay", bestBpm: 80, notes: "" },
  Outro: { status: "learning", bestBpm: 60, notes: "The (C G F) squeeze comes fast." },
};

/** Local wall-clock time in `timeZone` → the real instant. */
function zonedTime(day: string, hour: number, minute: number, timeZone: string): Date {
  const [year, month, date] = day.split("-").map(Number);
  const guess = Date.UTC(year, month - 1, date, hour, minute);
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone, hourCycle: "h23", year: "numeric", month: "numeric", day: "numeric", hour: "numeric", minute: "numeric",
  }).formatToParts(new Date(guess));
  const get = (type: string) => Number(parts.find((part) => part.type === type)?.value);
  const asUtc = Date.UTC(get("year"), get("month") - 1, get("day"), get("hour"), get("minute"));
  return new Date(guess - (asUtc - guess));
}

export async function clearPracticeData() {
  const db = await getDb();
  const rows = await db.select().from(recordings);
  for (const row of rows) {
    if (row.storage === "local") await rm(path.join(LOCAL_RECORDINGS_DIR, path.basename(row.key)), { force: true });
  }
  await db.delete(recordings);
  await db.delete(drillResults);
  await db.delete(lessonProgress);
  await db.delete(practiceSessions);
  await db.update(songSections).set({ status: "learning", bestBpm: null, notes: "" });
  return { recordingsRemoved: rows.length };
}

export async function seedDemoData(timeZone: string) {
  const db = await getDb();
  await clearPracticeData();

  const [song] = await db.select().from(songs).orderBy(songs.id).limit(1);
  if (!song) throw new Error("No song to attach demo data to.");
  const sections = await db.select().from(songSections).where(eq(songSections.songId, song.id));
  const sectionByName = new Map(sections.map((section) => [section.name, section]));
  const today = dayKey(new Date(), timeZone);
  await mkdir(LOCAL_RECORDINGS_DIR, { recursive: true });

  let seed = 1;
  for (const day of DAYS) {
    const date = addDays(today, day.offset);
    const entries = [
      { ...day, minuteOfHour: 5, manual: false },
      ...(day.extra ? [{ ...day.extra, offset: day.offset, minuteOfHour: 20, manual: true }] : []),
    ];

    for (const entry of entries) {
      let startedAt = zonedTime(date, entry.hour, entry.minuteOfHour, timeZone);
      const durationSeconds = entry.minutes * 60;
      // Today's session must already be over.
      if (startedAt.getTime() + durationSeconds * 1000 > Date.now()) {
        startedAt = new Date(Date.now() - durationSeconds * 1000 - 15 * 60_000);
      }
      const endedAt = new Date(startedAt.getTime() + durationSeconds * 1000);

      const [session] = await db
        .insert(practiceSessions)
        .values({
          kind: entry.manual ? "manual" : "timed",
          status: "completed",
          startedAt,
          endedAt,
          durationSeconds,
          songId: entry.sections.length ? song.id : null,
          focusAreas: entry.focus,
          sectionIds: entry.sections.map((name) => sectionByName.get(name)?.id).filter((id): id is number => Boolean(id)),
          bpm: entry.bpm,
          rating: entry.rating,
          notes: entry.notes,
          journalStatus: "ready",
          journal: entry.journal,
        })
        .returning({ id: practiceSessions.id });

      for (const slug of entry.lessons ?? []) {
        await db.insert(lessonProgress).values({ lessonSlug: slug, completedAt: new Date(endedAt.getTime() - 5 * 60_000) }).onConflictDoNothing();
      }
      for (const [index, drill] of (entry.drills ?? []).entries()) {
        await db.insert(drillResults).values({ ...drill, createdAt: new Date(startedAt.getTime() + (index + 1) * 4 * 60_000) });
      }

      if (entry.recording) {
        const bars = entry.recording.sections
          .flatMap((name) => sectionByName.get(name)?.bars ?? [])
          .slice(0, entry.recording.bars ?? Infinity);
        const wav = renderPractice({ bars, bpm: entry.recording.bpm, capo: song.capo, sloppiness: entry.recording.sloppiness, seed: seed++ });
        const createdAt = new Date(endedAt.getTime() - 3 * 60_000);
        const filename = localRecordingFilename("audio/wav", entry.recording.label, createdAt);
        await writeFile(path.join(LOCAL_RECORDINGS_DIR, filename), wav);
        await db.insert(recordings).values({
          sessionId: session.id,
          songId: song.id,
          storage: "local",
          key: filename,
          mimeType: "audio/wav",
          sizeBytes: wav.length,
          durationSeconds: Math.round(wavDurationSeconds(wav)),
          label: entry.recording.label,
          starred: entry.offset === 0 || entry.offset === -8,
          createdAt,
        });
      }
    }
  }

  for (const [name, state] of Object.entries(FINAL_SECTIONS)) {
    const section = sectionByName.get(name);
    if (section) await db.update(songSections).set(state).where(eq(songSections.id, section.id));
  }

  const [settingsRow] = await db.select().from(settings).where(eq(settings.id, 1));
  if (!settingsRow?.performanceDate) {
    await db.update(settings).set({ performanceDate: `${today.slice(0, 4)}-12-25`, performanceNote: "Christmas" }).where(eq(settings.id, 1));
  }

  return { days: DAYS.length, sessions: DAYS.length + DAYS.filter((day) => day.extra).length };
}
