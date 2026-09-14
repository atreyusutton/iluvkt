"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getDb } from "@/db";
import { drillResults, lessonProgress, recordings, settings } from "@/db/schema";
import { expectedSessionToken, isCorrectPassword, SESSION_COOKIE } from "@/lib/auth";
import { requireAuth } from "@/lib/require-auth";
import { deleteRecordingFile } from "@/lib/storage";

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
