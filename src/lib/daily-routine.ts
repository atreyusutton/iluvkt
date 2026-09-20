import type { FocusArea } from "@/content/focus-areas";
import { daysBetween } from "@/lib/time";

/**
 * The day's practice routine.
 *
 * The order is fixed — tune, warm up, one-minute changes, Travis picking, strum
 * through, then the song work — because a routine you have to decide on is a routine
 * you skip. What changes day to day is the content of each step: which chord pairs
 * came up in the rotation, which section is the weakest, what tempo to push for.
 */

/** A rough epoch for the day rotations. Any fixed date works; this one keeps the numbers small. */
const ROTATION_EPOCH = "2025-01-01";

export type RoutineStep = {
  /** Canonical focus area — the value the session's focus-area checkboxes store. */
  area: FocusArea;
  /** What the step is called in the plan, which is not always the focus area's name. */
  label: string;
  /** Fraction of the daily goal. Normalized across the steps that actually made it in. */
  share: number;
  detail: string;
  href: string | null;
};

export type RoutineChange = { first: string; second: string; doneToday: boolean };

export type RoutineSection = {
  name: string;
  status: "learning" | "okay" | "nailed";
  bestBpm: number | null;
};

export type RoutineSong = {
  title: string;
  capo: number;
  targetBpm: number;
  strummingPattern: string | null;
  sections: RoutineSection[];
};

export type RoutineInput = {
  /** Today's day key (YYYY-MM-DD) in the user's timezone. */
  today: string;
  changes: RoutineChange[];
  song: RoutineSong | null;
};

const WARM_UPS = [
  "Finger stretches, then a slow chromatic run up and down the neck",
  "Spider walk on strings 6–1, one finger per fret, slow and even",
  "Press and lift each open shape without strumming — clean placement, no buzz",
];

/** Where to start when a section has no recorded tempo yet: slow enough to play it clean. */
const COLD_START_FRACTION = 0.6;
/** Nudge the click up by this much once a section has a best tempo — small enough to stay clean. */
const BPM_STEP = 4;

const round5 = (bpm: number) => Math.max(40, Math.round(bpm / 5) * 5);

/** How many whole days into the rotation today is. Drives the picks that vary day to day. */
function dayIndex(today: string): number {
  return Math.max(0, daysBetween(ROTATION_EPOCH, today));
}

/** The tempo to aim the click at today: a cold start, or a small nudge past the best so far. */
export function workingBpm(bestBpm: number | null, targetBpm: number): number {
  if (bestBpm === null) return round5(targetBpm * COLD_START_FRACTION);
  return Math.min(targetBpm, bestBpm + BPM_STEP);
}

/**
 * The section to work today: whatever is least finished, rotating within a status band so
 * several days in a row don't grind the same one. Nailed sections are left alone.
 */
export function sectionForToday(sections: RoutineSection[], today: string): RoutineSection | null {
  const band =
    sections.filter((section) => section.status === "learning").length > 0
      ? sections.filter((section) => section.status === "learning")
      : sections.filter((section) => section.status === "okay");
  if (band.length === 0) return null;
  return band[dayIndex(today) % band.length];
}

function describeChanges(changes: RoutineChange[]): string {
  const names = changes.map((change) => `${change.first} ↔ ${change.second}`).join(" · ");
  const done = changes.filter((change) => change.doneToday).length;
  return `${names} — ${done} of ${changes.length} done`;
}

/** Scale the shares of the steps that made it in so the minutes still add up to the goal. */
function normalize(steps: RoutineStep[]): RoutineStep[] {
  const total = steps.reduce((sum, step) => sum + step.share, 0);
  if (total <= 0) return steps;
  return steps.map((step) => ({ ...step, share: step.share / total }));
}

export function buildRoutine({ today, changes, song }: RoutineInput): RoutineStep[] {
  const steps: RoutineStep[] = [];
  const section = song ? sectionForToday(song.sections, today) : null;
  const bpm = song ? workingBpm(section?.bestBpm ?? null, song.targetBpm) : null;

  steps.push({
    area: "Tuning",
    label: "Tune",
    share: 0.06,
    detail: song?.capo
      ? `Tune up, then put the capo on fret ${song.capo} and check it again`
      : "Tune up before anything else",
    href: "/tools/tuner",
  });

  steps.push({
    area: "Warm-up",
    label: "Warm-up",
    share: 0.08,
    detail: WARM_UPS[dayIndex(today) % WARM_UPS.length],
    href: null,
  });

  steps.push({
    area: "Chord changes",
    label: "One-minute changes",
    share: 0.2,
    detail: changes.length > 0 ? describeChanges(changes) : "One-minute changes on today's pairs",
    href: "/tools/chord-changes",
  });

  steps.push({
    area: "Picking pattern",
    label: "Travis picking",
    share: 0.2,
    detail: bpm
      ? `Travis pattern on one chord at ${bpm} BPM, then carry it through today's changes`
      : "Travis pattern on one chord, then carry it through today's changes",
    href: "/tools/metronome",
  });

  if (song) {
    const fallback = song.strummingPattern?.trim();
    steps.push({
      area: "Strumming",
      label: "Strum through",
      share: 0.17,
      detail: fallback
        ? `Strum ${song.title} top to bottom — ${fallback}`
        : `Strum ${song.title} top to bottom, keeping time through the changes`,
      href: "/songs",
    });
  }

  if (section) {
    steps.push({
      area: "Song sections",
      label: "Song sections",
      share: 0.2,
      detail:
        section.bestBpm === null
          ? `Play-along on "${section.name}" — first tempo on the board, start at ${bpm} BPM`
          : `Play-along on "${section.name}" — best so far ${section.bestBpm} BPM, push for ${bpm}`,
      href: "/songs",
    });
  }

  if (song) {
    // Every third day the run-through is a take worth keeping next to the older ones.
    const compare = dayIndex(today) % 3 === 0;
    steps.push({
      area: "Full run-through",
      label: "Full run-through",
      share: 0.09,
      detail: compare
        ? "Top to bottom without stopping — record it and play it against an older take"
        : "Top to bottom without stopping, mistakes and all",
      href: null,
    });
  }

  return normalize(steps);
}
