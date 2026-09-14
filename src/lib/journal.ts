import "server-only";
import { generateText, Output } from "ai";
import { and, desc, eq, gte, inArray, lt } from "drizzle-orm";
import { z } from "zod";
import { getDb } from "@/db";
import {
  drillResults,
  lessonProgress,
  practiceSessions,
  recordings,
  songSections,
  songs,
  type JournalEntry,
} from "@/db/schema";
import { findLesson } from "@/content/lessons";
import { getServiceStatus } from "./services";
import { getPracticeStats } from "./stats";
import { formatMinutes } from "./time";

export const JOURNAL_MODEL = "anthropic/claude-sonnet-5";

const journalSchema = z.object({
  title: z.string().describe("A short, specific title for this session, max 8 words"),
  whatIPracticed: z.string().describe("2-4 sentences in first person describing what was practiced"),
  progress: z.string().describe("2-4 sentences on how the player is progressing over recent sessions, citing concrete numbers"),
  wins: z.array(z.string()).describe("1-3 specific wins from this session"),
  focusNext: z.array(z.string()).describe("2-3 concrete, specific things to focus on next session"),
  encouragement: z.string().describe("One warm sentence of encouragement"),
}) satisfies z.ZodType<JournalEntry>;

async function buildPrompt(sessionId: number, timeZone: string): Promise<string> {
  const db = await getDb();
  const [session] = await db.select().from(practiceSessions).where(eq(practiceSessions.id, sessionId));
  if (!session) throw new Error(`Session ${sessionId} not found`);

  const endedAt = session.endedAt ?? new Date();
  const [song] = session.songId ? await db.select().from(songs).where(eq(songs.id, session.songId)) : [];
  const [sections, sessionRecordings, drills, lessons, history, stats] = await Promise.all([
    session.sectionIds.length
      ? db.select().from(songSections).where(inArray(songSections.id, session.sectionIds))
      : Promise.resolve([]),
    db.select().from(recordings).where(eq(recordings.sessionId, sessionId)),
    db.select().from(drillResults).where(and(gte(drillResults.createdAt, session.startedAt))),
    db.select().from(lessonProgress).where(gte(lessonProgress.completedAt, session.startedAt)),
    db
      .select()
      .from(practiceSessions)
      .where(and(eq(practiceSessions.status, "completed"), lt(practiceSessions.startedAt, session.startedAt)))
      .orderBy(desc(practiceSessions.startedAt))
      .limit(10),
    getPracticeStats(timeZone),
  ]);

  const sessionDrills = drills.filter((drill) => drill.createdAt <= endedAt);
  const lines = [
    `## This session`,
    `Date: ${session.startedAt.toISOString()}`,
    `Duration: ${formatMinutes(session.durationSeconds / 60)}${session.kind === "manual" ? " (logged manually)" : ""}`,
    `Focus areas: ${session.focusAreas.join(", ") || "not specified"}`,
    song ? `Song: ${song.title} by ${song.artist} (target tempo ${song.targetBpm} BPM)` : `Song: none selected`,
    sections.length
      ? `Sections worked on: ${sections.map((s) => `${s.name} [status: ${s.status}, best tempo: ${s.bestBpm ?? "not set"} BPM]`).join("; ")}`
      : "",
    session.bpm ? `Play-along tempo reached: ${session.bpm} BPM` : "",
    session.rating ? `Self-rating: ${session.rating}/5` : "",
    `Recordings made: ${sessionRecordings.length}`,
    sessionDrills.length
      ? `Drills: ${sessionDrills.map((d) => `${d.type} ${d.key} → ${d.score}`).join("; ")}`
      : "",
    lessons.length
      ? `Lessons completed: ${lessons.map((l) => findLesson(l.lessonSlug)?.lesson.title ?? l.lessonSlug).join(", ")}`
      : "",
    `Player's notes: ${session.notes || "(none)"}`,
    ``,
    `## Overall`,
    `Total practice: ${formatMinutes(stats.totalMinutes)} across ${stats.totalSessions} sessions`,
    `Daily goal: ${stats.goalMinutes} min. Today so far: ${formatMinutes(stats.todayMinutes)}`,
    `Current streak: ${stats.currentStreak} days (longest ${stats.longestStreak})`,
    `Last 7 days (minutes): ${stats.last7.map((d) => `${d.day}: ${Math.round(d.minutes)}`).join(", ")}`,
    ``,
    `## Previous sessions (newest first)`,
    ...history.map((past) => {
      const summary = past.journal ? ` — ${past.journal.title}: ${past.journal.whatIPracticed}` : "";
      return `- ${past.startedAt.toISOString().slice(0, 10)}: ${formatMinutes(past.durationSeconds / 60)}, focus ${past.focusAreas.join(", ") || "n/a"}${past.bpm ? `, ${past.bpm} BPM` : ""}${past.rating ? `, rated ${past.rating}/5` : ""}${summary}`;
    }),
  ];
  return lines.filter((line) => line !== "").join("\n");
}

/** Writes the AI journal for a completed session. Failures are stored on the session so they can be retried. */
export async function generateJournal(sessionId: number, timeZone: string) {
  const db = await getDb();

  if (getServiceStatus().ai === "off") {
    await db
      .update(practiceSessions)
      .set({ journalStatus: "pending", journalError: "AI isn't configured yet — add AI Gateway to generate this entry." })
      .where(eq(practiceSessions.id, sessionId));
    return;
  }

  await db
    .update(practiceSessions)
    .set({ journalStatus: "pending", journalError: null })
    .where(eq(practiceSessions.id, sessionId));

  try {
    const prompt = await buildPrompt(sessionId, timeZone);
    const { output } = await generateText({
      model: JOURNAL_MODEL,
      output: Output.object({ schema: journalSchema }),
      system:
        "You are a supportive, knowledgeable guitar teacher writing a practice journal entry for a beginner who is learning guitar to play Bob Dylan's \"Don't Think Twice, It's All Right\" for their girlfriend, practicing about 30 minutes a day. Write in first person as the player's journal ('I worked on...') for whatPracticed and wins; write progress and focusNext as the teacher speaking to the player ('You...'). Be specific and grounded in the data provided — cite minutes, tempos, drill scores and streaks. Never invent practice that isn't in the data. Keep it concise and warm, not cheesy.",
      prompt,
    });
    await db
      .update(practiceSessions)
      .set({ journalStatus: "ready", journal: output, journalError: null })
      .where(eq(practiceSessions.id, sessionId));
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`Journal generation failed for session ${sessionId}:`, error);
    await db
      .update(practiceSessions)
      .set({ journalStatus: "error", journalError: message.slice(0, 500) })
      .where(eq(practiceSessions.id, sessionId));
  }
}
