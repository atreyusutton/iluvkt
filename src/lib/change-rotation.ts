import { type ChordPair, normalizePairKey } from "@/lib/chord-pairs";
import { dayKey, daysBetween } from "@/lib/time";

/**
 * Every change in a song is worth drilling, but a song with fifteen of them is
 * fifteen minutes of one-minute changes — half a session. So the whole list stays
 * tracked and only a handful come up each day, picked by what's weakest and stalest.
 */
export const CHANGES_PER_DAY = 5;

/** Once a pair is fast, it drops out of the rotation until it's gone this stale. */
export const REST_DAYS_WHEN_STRONG = 14;

/** A clean change every two seconds — the point where a pair stops being the bottleneck. */
const SOLID_SCORE = 30;
/** Roughly one change every 1.3 seconds: fast enough to play the song at tempo. */
const STRONG_SCORE = 45;
/** One change per second, the traditional target. */
const TARGET_SCORE = 60;

/** Staleness stops counting for more than you've forgotten. */
const STALENESS_CAP_DAYS = 30;

export type Tier = "new" | "building" | "solid" | "strong";

export type SongPairs = { title: string; pairs: ChordPair[] };

export type MergedPair = ChordPair & { songs: string[] };

export type DrillRow = { key: string; score: number; createdAt: Date };

export type PairProgress = MergedPair & {
  best: number | null;
  attempts: number;
  /** Day key of the most recent attempt before today, or null if never drilled. */
  lastDrilled: string | null;
  daysSince: number | null;
  tier: Tier;
  /** Already fast and drilled recently — out of rotation until it goes stale. */
  resting: boolean;
  priority: number;
  doneToday: boolean;
};

export function tierOf(best: number | null): Tier {
  if (best === null) return "new";
  if (best < SOLID_SCORE) return "building";
  if (best < STRONG_SCORE) return "solid";
  return "strong";
}

export const TIER_LABELS: Record<Tier, string> = {
  new: "Not tried",
  building: "Building",
  solid: "Solid",
  strong: "Fast",
};

/** The same change can appear in more than one song; drill it once, counting both. */
export function mergePairs(groups: SongPairs[]): MergedPair[] {
  const merged = new Map<string, MergedPair>();

  for (const group of groups) {
    for (const pair of group.pairs) {
      const existing = merged.get(pair.key);
      if (!existing) {
        merged.set(pair.key, { ...pair, sections: [...pair.sections], songs: [group.title] });
        continue;
      }
      existing.count += pair.count;
      for (const section of pair.sections) {
        if (!existing.sections.includes(section)) existing.sections.push(section);
      }
      if (!existing.songs.includes(group.title)) existing.songs.push(group.title);
    }
  }

  return [...merged.values()];
}

/**
 * Untried changes first, then whatever is weakest and least recently drilled.
 * `count` (how often the song asks for the change) is only ever a tiebreak.
 */
function priorityOf(count: number, best: number | null, daysSince: number | null) {
  if (best === null || daysSince === null) return 1000 + count;
  const weakness = Math.max(0, TARGET_SCORE - best) * 2;
  const staleness = Math.min(daysSince, STALENESS_CAP_DAYS) * 3;
  return weakness + staleness + count;
}

/**
 * Score every pair against its drill history, most urgent first.
 *
 * Results from today are deliberately left out of the ranking and only used to set
 * `doneToday`: if a score you just saved re-ranked its own pair, the day's set would
 * reshuffle under you as you worked through it. Ranking as of the start of the day
 * keeps the set fixed and lets the UI count off what's done.
 */
export function rankPairs(
  pairs: MergedPair[],
  results: DrillRow[],
  today: string,
  timeZone: string,
): PairProgress[] {
  const history = new Map<string, { best: number; attempts: number; lastDay: string }>();
  const doneToday = new Set<string>();

  for (const row of results) {
    const key = normalizePairKey(row.key);
    const day = dayKey(row.createdAt, timeZone);
    if (day >= today) {
      doneToday.add(key);
      continue;
    }
    const entry = history.get(key);
    if (!entry) {
      history.set(key, { best: row.score, attempts: 1, lastDay: day });
      continue;
    }
    entry.best = Math.max(entry.best, row.score);
    entry.attempts += 1;
    if (day > entry.lastDay) entry.lastDay = day;
  }

  return pairs
    .map((pair) => {
      const entry = history.get(pair.key);
      const best = entry?.best ?? null;
      const daysSince = entry ? daysBetween(entry.lastDay, today) : null;
      const tier = tierOf(best);
      return {
        ...pair,
        best,
        attempts: entry?.attempts ?? 0,
        lastDrilled: entry?.lastDay ?? null,
        daysSince,
        tier,
        resting: tier === "strong" && daysSince !== null && daysSince < REST_DAYS_WHEN_STRONG,
        priority: priorityOf(pair.count, best, daysSince),
        doneToday: doneToday.has(pair.key),
      };
    })
    .sort(
      (a, b) =>
        Number(a.resting) - Number(b.resting) || b.priority - a.priority || a.key.localeCompare(b.key),
    );
}

/**
 * The day's set. `rankPairs` already sorts resting pairs last, so taking the top few
 * picks what's due and falls back to the stalest fast pairs when nothing else is.
 */
export function todaysChanges(ranked: PairProgress[], size = CHANGES_PER_DAY): PairProgress[] {
  return ranked.slice(0, size);
}

/** Why this pair came up today, for the line under its name. */
export function pickReason(pair: PairProgress): string {
  if (pair.attempts === 0) return "never tried";
  if (pair.daysSince === null) return "never tried";
  if (pair.daysSince <= 1) return "drilled yesterday";
  return `${pair.daysSince} days ago`;
}

export function describeChanges(picks: PairProgress[]): string {
  return picks.map((pair) => `${pair.first} ↔ ${pair.second}`).join(" · ");
}
