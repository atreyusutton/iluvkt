"use server";

import { and, eq, max } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getDb } from "@/db";
import { songSections, songs, videoBookmarks, videos, type Bar, type SongSection } from "@/db/schema";
import { TRAVIS_PATTERN } from "@/content/songs";
import { requireAuth } from "@/lib/require-auth";
import { parseYouTubeId } from "@/lib/youtube";

function toInt(value: FormDataEntryValue | null, fallback: number): number {
  const parsed = Number.parseInt(String(value ?? ""), 10);
  return Number.isFinite(parsed) ? parsed : fallback;
}

/** "C G Am F" or "C:2 G:2 Am" → bars; beats default to the song's bar length. */
function parseBars(text: string, beatsPerBar: number): Bar[] {
  return text
    .split(/[\s|,]+/)
    .filter(Boolean)
    .map((token) => {
      const [chord, beats] = token.split(":");
      const parsedBeats = Number.parseInt(beats ?? "", 10);
      return { chord, beats: Number.isFinite(parsedBeats) && parsedBeats > 0 ? parsedBeats : beatsPerBar };
    });
}

export async function createSong(formData: FormData) {
  await requireAuth();
  const db = await getDb();
  const title = String(formData.get("title") ?? "").trim();
  if (!title) throw new Error("A song needs a title.");
  const [song] = await db
    .insert(songs)
    .values({
      title,
      artist: String(formData.get("artist") ?? "").trim(),
      capo: toInt(formData.get("capo"), 0),
      targetBpm: toInt(formData.get("targetBpm"), 100),
      pickingPattern: formData.get("fingerpicked") ? TRAVIS_PATTERN : null,
    })
    .returning({ id: songs.id });
  await db.insert(songSections).values({ songId: song.id, name: "Verse", position: 0, bars: [] });
  revalidatePath("/songs");
  redirect(`/songs/${song.id}`);
}

export async function updateSongDetails(songId: number, formData: FormData) {
  await requireAuth();
  const db = await getDb();
  await db
    .update(songs)
    .set({
      title: String(formData.get("title") ?? "").trim() || "Untitled",
      artist: String(formData.get("artist") ?? "").trim(),
      capo: toInt(formData.get("capo"), 0),
      targetBpm: toInt(formData.get("targetBpm"), 100),
      beatsPerBar: Math.min(12, Math.max(2, toInt(formData.get("beatsPerBar"), 4))),
      tuning: String(formData.get("tuning") ?? "").trim() || "Standard (E A D G B E)",
      strummingPattern: String(formData.get("strummingPattern") ?? "").trim() || null,
      notes: String(formData.get("notes") ?? ""),
    })
    .where(eq(songs.id, songId));
  revalidatePath(`/songs/${songId}`);
  revalidatePath("/songs");
}

export async function saveChordSheet(songId: number, chordSheet: string) {
  await requireAuth();
  const db = await getDb();
  await db.update(songs).set({ chordSheet }).where(eq(songs.id, songId));
  revalidatePath(`/songs/${songId}`);
}

export async function updateSection(
  sectionId: number,
  patch: Partial<Pick<SongSection, "status" | "bestBpm" | "notes" | "name">> & { barsText?: string },
) {
  await requireAuth();
  const db = await getDb();
  const [section] = await db.select().from(songSections).where(eq(songSections.id, sectionId));
  if (!section) throw new Error("Section not found.");
  const [song] = await db.select({ beatsPerBar: songs.beatsPerBar }).from(songs).where(eq(songs.id, section.songId));

  const { barsText, ...fields } = patch;
  await db
    .update(songSections)
    .set({
      ...fields,
      ...(barsText !== undefined ? { bars: parseBars(barsText, song?.beatsPerBar ?? 4) } : {}),
    })
    .where(eq(songSections.id, sectionId));
  revalidatePath(`/songs/${section.songId}`);
  revalidatePath("/milestones");
}

/** Only raises the stored best tempo, never lowers it. */
export async function recordSectionTempo(sectionIds: number[], bpm: number) {
  await requireAuth();
  const db = await getDb();
  let songId: number | null = null;
  for (const id of sectionIds) {
    const [section] = await db.select().from(songSections).where(eq(songSections.id, id));
    if (!section) continue;
    songId = section.songId;
    if ((section.bestBpm ?? 0) < bpm) {
      await db.update(songSections).set({ bestBpm: bpm }).where(eq(songSections.id, id));
    }
  }
  if (songId) revalidatePath(`/songs/${songId}`);
}

export async function addSection(songId: number, name: string) {
  await requireAuth();
  const db = await getDb();
  const [{ value }] = await db
    .select({ value: max(songSections.position) })
    .from(songSections)
    .where(eq(songSections.songId, songId));
  await db.insert(songSections).values({ songId, name: name.trim() || "New section", position: (value ?? -1) + 1 });
  revalidatePath(`/songs/${songId}`);
}

export async function deleteSection(sectionId: number) {
  await requireAuth();
  const db = await getDb();
  const [deleted] = await db
    .delete(songSections)
    .where(eq(songSections.id, sectionId))
    .returning({ songId: songSections.songId });
  if (deleted) revalidatePath(`/songs/${deleted.songId}`);
}

export async function addVideo(target: { songId?: number; lessonSlug?: string }, url: string, title: string) {
  await requireAuth();
  const youtubeId = parseYouTubeId(url);
  if (!youtubeId) return { error: "That doesn't look like a YouTube link." };
  const db = await getDb();
  await db.insert(videos).values({
    songId: target.songId ?? null,
    lessonSlug: target.lessonSlug ?? null,
    youtubeId,
    title: title.trim(),
  });
  revalidatePath(target.songId ? `/songs/${target.songId}` : `/lessons/${target.lessonSlug}`);
  return { error: null };
}

export async function removeVideo(videoId: number) {
  await requireAuth();
  const db = await getDb();
  const [deleted] = await db.delete(videos).where(eq(videos.id, videoId)).returning();
  if (deleted?.songId) revalidatePath(`/songs/${deleted.songId}`);
  if (deleted?.lessonSlug) revalidatePath(`/lessons/${deleted.lessonSlug}`);
}

export async function addBookmark(videoId: number, seconds: number, note: string) {
  await requireAuth();
  const db = await getDb();
  const [bookmark] = await db
    .insert(videoBookmarks)
    .values({ videoId, seconds: Math.max(0, Math.floor(seconds)), note: note.trim() })
    .returning();
  return bookmark;
}

export async function removeBookmark(videoId: number, bookmarkId: number) {
  await requireAuth();
  const db = await getDb();
  await db
    .delete(videoBookmarks)
    .where(and(eq(videoBookmarks.id, bookmarkId), eq(videoBookmarks.videoId, videoId)));
}
