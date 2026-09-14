import "server-only";
import { asc, eq, inArray } from "drizzle-orm";
import { getDb } from "@/db";
import { videoBookmarks, videos } from "@/db/schema";

export async function getVideosWithBookmarks(target: { songId: number } | { lessonSlug: string }) {
  const db = await getDb();
  const rows = await db
    .select()
    .from(videos)
    .where("songId" in target ? eq(videos.songId, target.songId) : eq(videos.lessonSlug, target.lessonSlug))
    .orderBy(asc(videos.createdAt));
  if (rows.length === 0) return [];
  const marks = await db
    .select()
    .from(videoBookmarks)
    .where(inArray(videoBookmarks.videoId, rows.map((row) => row.id)))
    .orderBy(asc(videoBookmarks.seconds));
  return rows.map((row) => ({ ...row, bookmarks: marks.filter((mark) => mark.videoId === row.id) }));
}
