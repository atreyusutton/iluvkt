import "server-only";
import { and, count, desc, eq, max } from "drizzle-orm";
import { getDb } from "@/db";
import { drillResults, lessonProgress, practiceSessions, recordings, settings, songSections, songs } from "@/db/schema";
import { addDays, dayKey } from "./time";

export type DayTotal = { day: string; minutes: number };

export type PracticeStats = {
  totalMinutes: number;
  totalSessions: number;
  todayMinutes: number;
  goalMinutes: number;
  currentStreak: number;
  longestStreak: number;
  goalDays: number;
  daysPracticed: number;
  byDay: Map<string, number>;
  last7: DayTotal[];
  today: string;
};

export async function getPracticeStats(timeZone: string): Promise<PracticeStats> {
  const db = await getDb();
  const [settingsRow] = await db.select().from(settings).where(eq(settings.id, 1));
  const goalMinutes = settingsRow?.dailyGoalMinutes ?? 30;

  const rows = await db
    .select({ startedAt: practiceSessions.startedAt, durationSeconds: practiceSessions.durationSeconds })
    .from(practiceSessions)
    .where(eq(practiceSessions.status, "completed"));

  const byDay = new Map<string, number>();
  let totalSeconds = 0;
  for (const row of rows) {
    totalSeconds += row.durationSeconds;
    const key = dayKey(row.startedAt, timeZone);
    byDay.set(key, (byDay.get(key) ?? 0) + row.durationSeconds / 60);
  }

  const today = dayKey(new Date(), timeZone);
  const practicedDays = [...byDay.entries()].filter(([, minutes]) => minutes >= 1).map(([day]) => day).sort();

  let longestStreak = 0;
  let run = 0;
  let previous: string | null = null;
  for (const day of practicedDays) {
    run = previous && addDays(previous, 1) === day ? run + 1 : 1;
    longestStreak = Math.max(longestStreak, run);
    previous = day;
  }

  // A streak stays alive until the end of today even if you haven't practiced yet.
  const practiced = new Set(practicedDays);
  let cursor = practiced.has(today) ? today : addDays(today, -1);
  let currentStreak = 0;
  while (practiced.has(cursor)) {
    currentStreak++;
    cursor = addDays(cursor, -1);
  }

  const last7 = Array.from({ length: 7 }, (_, index) => {
    const day = addDays(today, index - 6);
    return { day, minutes: byDay.get(day) ?? 0 };
  });

  return {
    totalMinutes: totalSeconds / 60,
    totalSessions: rows.length,
    todayMinutes: byDay.get(today) ?? 0,
    goalMinutes,
    currentStreak,
    longestStreak,
    goalDays: [...byDay.values()].filter((minutes) => minutes >= goalMinutes).length,
    daysPracticed: practicedDays.length,
    byDay,
    last7,
    today,
  };
}

export type Badge = {
  id: string;
  title: string;
  description: string;
  emoji: string;
  progress: number;
  target: number;
  earned: boolean;
};

export async function getBadges(stats: PracticeStats): Promise<Badge[]> {
  const db = await getDb();
  const [[recordingCount], [lessonCount], sections, [bestChordChange], firstSong] = await Promise.all([
    db.select({ value: count() }).from(recordings),
    db.select({ value: count() }).from(lessonProgress),
    db.select({ status: songSections.status, bestBpm: songSections.bestBpm, songId: songSections.songId }).from(songSections),
    db.select({ value: max(drillResults.score) }).from(drillResults).where(eq(drillResults.type, "chord-change")),
    db.select({ id: songs.id, targetBpm: songs.targetBpm }).from(songs).orderBy(songs.id).limit(1),
  ]);

  const hours = stats.totalMinutes / 60;
  const firstSongSections = sections.filter((section) => section.songId === firstSong[0]?.id);
  const nailed = firstSongSections.filter((section) => section.status === "nailed").length;
  const atTempo = firstSongSections.filter(
    (section) => (section.bestBpm ?? 0) >= (firstSong[0]?.targetBpm ?? Infinity),
  ).length;

  const make = (
    id: string,
    emoji: string,
    title: string,
    description: string,
    progress: number,
    target: number,
  ): Badge => ({ id, emoji, title, description, progress: Math.min(progress, target), target, earned: progress >= target });

  return [
    make("first-session", "🎸", "First strum", "Finish your first practice session", stats.totalSessions, 1),
    make("first-goal", "⏱️", "Full half hour", `Hit your ${stats.goalMinutes}-minute goal in a day`, stats.goalDays, 1),
    make("hour-1", "🌱", "One hour in", "Practice 1 hour total", hours, 1),
    make("hours-10", "🌿", "Ten hours", "Practice 10 hours total", hours, 10),
    make("hours-25", "🌳", "Twenty-five hours", "Practice 25 hours total", hours, 25),
    make("hours-50", "🔥", "Fifty hours", "Practice 50 hours total", hours, 50),
    make("hours-100", "🏆", "Hundred hours", "Practice 100 hours total", hours, 100),
    make("streak-3", "✨", "Three in a row", "Practice 3 days in a row", stats.longestStreak, 3),
    make("streak-7", "📅", "A full week", "Practice 7 days in a row", stats.longestStreak, 7),
    make("streak-30", "💎", "Thirty-day habit", "Practice 30 days in a row", stats.longestStreak, 30),
    make("goal-week", "🎯", "Goal week", `Hit your daily goal on 7 different days`, stats.goalDays, 7),
    make("first-recording", "🎙️", "On tape", "Save your first recording", recordingCount.value, 1),
    make("recordings-10", "📼", "Ten takes", "Save 10 recordings", recordingCount.value, 10),
    make("lessons-5", "📚", "Student", "Complete 5 lessons", lessonCount.value, 5),
    make("changes-30", "🔁", "Smooth changer", "Score 30 in a one-minute chord change", bestChordChange.value ?? 0, 30),
    make("changes-60", "⚡", "One per second", "Score 60 in a one-minute chord change", bestChordChange.value ?? 0, 60),
    make("sections-nailed", "💫", "Every section nailed", "Mark every section of your first song as nailed", nailed, Math.max(firstSongSections.length, 1)),
    make("full-tempo", "💌", "Ready to play it for her", "Reach target tempo on every section of your first song", atTempo, Math.max(firstSongSections.length, 1)),
  ];
}

export async function getActiveSession() {
  const db = await getDb();
  const [active] = await db
    .select()
    .from(practiceSessions)
    .where(and(eq(practiceSessions.status, "active"), eq(practiceSessions.kind, "timed")))
    .orderBy(desc(practiceSessions.startedAt))
    .limit(1);
  return active ?? null;
}
