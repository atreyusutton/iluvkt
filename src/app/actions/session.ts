"use server";

import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { after } from "next/server";
import { getDb } from "@/db";
import { practiceSessions } from "@/db/schema";
import { generateJournal } from "@/lib/journal";
import { requireAuth } from "@/lib/require-auth";
import { getTimezone } from "@/lib/timezone";

export async function startSession(): Promise<{ id: number; startedAt: string }> {
  await requireAuth();
  const db = await getDb();
  const [session] = await db
    .insert(practiceSessions)
    .values({ kind: "timed", status: "active" })
    .returning({ id: practiceSessions.id, startedAt: practiceSessions.startedAt });
  revalidatePath("/", "layout");
  return { id: session.id, startedAt: session.startedAt.toISOString() };
}

export type FinishSessionInput = {
  sessionId: number;
  durationSeconds: number;
  focusAreas: string[];
  songId: number | null;
  sectionIds: number[];
  bpm: number | null;
  rating: number | null;
  notes: string;
};

export async function finishSession(input: FinishSessionInput) {
  await requireAuth();
  const db = await getDb();
  const timeZone = await getTimezone();
  const [updated] = await db
    .update(practiceSessions)
    .set({
      status: "completed",
      endedAt: new Date(),
      durationSeconds: Math.max(0, Math.round(input.durationSeconds)),
      focusAreas: input.focusAreas,
      songId: input.songId,
      sectionIds: input.sectionIds,
      bpm: input.bpm,
      rating: input.rating,
      notes: input.notes.trim(),
      journalStatus: "pending",
    })
    .where(and(eq(practiceSessions.id, input.sessionId), eq(practiceSessions.status, "active")))
    .returning({ id: practiceSessions.id });
  if (!updated) throw new Error("That session was already finished or doesn't exist.");

  after(() => generateJournal(updated.id, timeZone));
  revalidatePath("/", "layout");
  return { id: updated.id };
}

export async function discardSession(sessionId: number) {
  await requireAuth();
  const db = await getDb();
  await db
    .delete(practiceSessions)
    .where(and(eq(practiceSessions.id, sessionId), eq(practiceSessions.status, "active")));
  revalidatePath("/", "layout");
}

export async function logManualSession(input: Omit<FinishSessionInput, "sessionId"> & { date: string }) {
  await requireAuth();
  const db = await getDb();
  const timeZone = await getTimezone();
  if (input.durationSeconds < 60) throw new Error("Log at least one minute.");
  // Noon UTC on the chosen date keeps it on that calendar day in nearly every timezone.
  const startedAt = new Date(`${input.date}T12:00:00Z`);
  if (Number.isNaN(startedAt.getTime())) throw new Error("Invalid date.");

  const [created] = await db
    .insert(practiceSessions)
    .values({
      kind: "manual",
      status: "completed",
      startedAt,
      endedAt: startedAt,
      durationSeconds: Math.round(input.durationSeconds),
      focusAreas: input.focusAreas,
      songId: input.songId,
      sectionIds: input.sectionIds,
      bpm: input.bpm,
      rating: input.rating,
      notes: input.notes.trim(),
      journalStatus: "pending",
    })
    .returning({ id: practiceSessions.id });

  after(() => generateJournal(created.id, timeZone));
  revalidatePath("/", "layout");
  return { id: created.id };
}

export async function retryJournal(sessionId: number) {
  await requireAuth();
  const timeZone = await getTimezone();
  await generateJournal(sessionId, timeZone);
  revalidatePath(`/journal/${sessionId}`);
  revalidatePath("/journal");
}

export async function updateSessionNotes(sessionId: number, notes: string) {
  await requireAuth();
  const db = await getDb();
  await db.update(practiceSessions).set({ notes: notes.trim() }).where(eq(practiceSessions.id, sessionId));
  revalidatePath(`/journal/${sessionId}`);
}
