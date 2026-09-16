"use server";

import { asc, eq, inArray } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { after } from "next/server";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getDb } from "@/db";
import { drillResults, lessonProgress, practiceSessions, recordings, settings } from "@/db/schema";
import { expectedSessionToken, isCorrectPassword, SESSION_COOKIE } from "@/lib/auth";
import { generateJournal } from "@/lib/journal";
import { requireAuth } from "@/lib/require-auth";
import { deleteRecordingFile } from "@/lib/storage";
import { dayKey } from "@/lib/time";
import { getTimezone } from "@/lib/timezone";

export async function login(_previous: { error: string | null }, formData: FormData): Promise<{ error: string | null }> {
  const password = String(formData.get("password") ?? "");
  if (!(await isCorrectPassword(password))) return { error: "Wrong password." };

  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE, await expectedSessionToken(), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 90,
  });
  const next = String(formData.get("next") ?? "/");
  redirect(next.startsWith("/") && !next.startsWith("//") ? next : "/");
}

export async function logout() {
  (await cookies()).delete(SESSION_COOKIE);
  redirect("/login");
}

export async function setLessonComplete(slug: string, complete: boolean) {
  await requireAuth();
  const db = await getDb();
  if (complete) {
    await db.insert(lessonProgress).values({ lessonSlug: slug }).onConflictDoNothing();
  } else {
    await db.delete(lessonProgress).where(eq(lessonProgress.lessonSlug, slug));
  }
  revalidatePath("/lessons", "layout");
}

export async function saveDrillResult(type: "chord-change" | "fretboard", key: string, score: number) {
  await requireAuth();
  const db = await getDb();
  const [result] = await db
    .insert(drillResults)
    .values({ type, key, score: Math.max(0, Math.round(score)) })
    .returning();
  revalidatePath("/tools", "layout");
  return { id: result.id, createdAt: result.createdAt.toISOString(), score: result.score, key: result.key };
}

export async function setRecordingStarred(recordingId: number, starred: boolean) {
  await requireAuth();
  const db = await getDb();
  await db.update(recordings).set({ starred }).where(eq(recordings.id, recordingId));
  revalidatePath("/recordings");
}

export async function renameRecording(recordingId: number, label: string) {
  await requireAuth();
  const db = await getDb();
  await db.update(recordings).set({ label: label.trim() }).where(eq(recordings.id, recordingId));
  revalidatePath("/recordings");
}

export async function deleteRecording(recordingId: number) {
  await requireAuth();
  const db = await getDb();
  const [recording] = await db.select().from(recordings).where(eq(recordings.id, recordingId));
  if (!recording) return;
  await deleteRecordingFile(recording);
  await db.delete(recordings).where(eq(recordings.id, recordingId));
  revalidatePath("/recordings");
}

export async function updateSettings(formData: FormData) {
  await requireAuth();
  const db = await getDb();
  const goal = Number.parseInt(String(formData.get("dailyGoalMinutes") ?? "30"), 10);
  const text = (name: string) => String(formData.get(name) ?? "").trim() || null;
  await db
    .update(settings)
    .set({
      dailyGoalMinutes: Number.isFinite(goal) ? Math.min(600, Math.max(5, goal)) : 30,
      playingFor: text("playingFor"),
      performanceDate: text("performanceDate"),
      performanceNote: text("performanceNote"),
    })
    .where(eq(settings.id, 1));
  revalidatePath("/", "layout");
}

type Session = typeof practiceSessions.$inferSelect;

/** Completed sessions bucketed by the calendar day they started, oldest first within a day. */
async function completedSessionsByDay() {
  const [timeZone, db] = await Promise.all([getTimezone(), getDb()]);
  const rows = await db
    .select()
    .from(practiceSessions)
    .where(eq(practiceSessions.status, "completed"))
    .orderBy(asc(practiceSessions.startedAt));

  const days = new Map<string, Session[]>();
  for (const session of rows) {
    const key = dayKey(session.startedAt, timeZone);
    days.set(key, [...(days.get(key) ?? []), session]);
  }
  return { days, timeZone };
}

export type DayMergeCandidate = { day: string; sessions: number; minutes: number; recordings: number };

/** Read-only: which days were logged as more than one session. */
export async function previewDayMerge(): Promise<DayMergeCandidate[]> {
  await requireAuth();
  const { days } = await completedSessionsByDay();
  const candidates = [...days.entries()].filter(([, sessions]) => sessions.length > 1);
  if (candidates.length === 0) return [];

  const db = await getDb();
  const ids = candidates.flatMap(([, sessions]) => sessions.map((session) => session.id));
  const takes = await db.select({ sessionId: recordings.sessionId }).from(recordings).where(inArray(recordings.sessionId, ids));

  return candidates.map(([day, sessions]) => ({
    day,
    sessions: sessions.length,
    minutes: Math.round(sessions.reduce((sum, session) => sum + session.durationSeconds, 0) / 60),
    recordings: takes.filter((take) => sessions.some((session) => session.id === take.sessionId)).length,
  }));
}

/**
 * Fold every day's sessions into one. The earliest session of the day survives and absorbs the
 * others' time, notes and recordings; the rest are deleted. Active sessions are left alone.
 */
export async function mergeSessionsByDay() {
  await requireAuth();
  const { days, timeZone } = await completedSessionsByDay();
  const db = await getDb();
  const rewrite: number[] = [];
  let merged = 0;

  for (const sessions of days.values()) {
    if (sessions.length < 2) continue;
    const [survivor, ...absorbed] = sessions;
    const absorbedIds = absorbed.map((session) => session.id);
    const first = <T,>(pick: (session: Session) => T | null) => sessions.map(pick).find((value) => value !== null) ?? null;
    const ready = sessions.filter((session) => session.journalStatus === "ready");
    // A write-up of one part of the day would misdescribe the merged whole, so keep it only
    // when there's exactly one and drop back to "none" otherwise — the journal can be rewritten.
    const keepJournal = ready.length === 1 ? ready[0] : null;

    await db
      .update(practiceSessions)
      .set({
        durationSeconds: sessions.reduce((sum, session) => sum + session.durationSeconds, 0),
        endedAt: sessions.reduce<Date | null>((latest, session) => {
          if (!session.endedAt) return latest;
          return !latest || session.endedAt > latest ? session.endedAt : latest;
        }, null),
        notes: sessions.map((session) => session.notes.trim()).filter(Boolean).join("\n\n"),
        rating: sessions.reduce<number | null>((max, s) => (s.rating !== null && (max === null || s.rating > max) ? s.rating : max), null),
        focusAreas: [...new Set(sessions.flatMap((session) => session.focusAreas))],
        sectionIds: [...new Set(sessions.flatMap((session) => session.sectionIds))],
        songId: first((session) => session.songId),
        bpm: first((session) => session.bpm),
        journal: keepJournal?.journal ?? null,
        // The merged day is a different session than any of the write-ups described, so ask
        // for a fresh one rather than leaving it in a state that reads as "still writing".
        journalStatus: keepJournal ? "ready" : "pending",
        journalError: null,
      })
      .where(eq(practiceSessions.id, survivor.id));

    await db.update(recordings).set({ sessionId: survivor.id }).where(inArray(recordings.sessionId, absorbedIds));
    await db.delete(practiceSessions).where(inArray(practiceSessions.id, absorbedIds));
    if (!keepJournal) rewrite.push(survivor.id);
    merged += absorbed.length;
  }

  after(async () => {
    for (const id of rewrite) await generateJournal(id, timeZone);
  });
  revalidatePath("/", "layout");
  return { merged };
}
