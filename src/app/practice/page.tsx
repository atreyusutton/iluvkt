import { asc } from "drizzle-orm";
import { getDb } from "@/db";
import { songSections, songs } from "@/db/schema";
import { getActiveSession, getPracticeStats } from "@/lib/stats";
import { getTimezone } from "@/lib/timezone";
import { PracticeRoom } from "./practice-room";

export const metadata = { title: "Practice" };

export default async function PracticePage() {
  const db = await getDb();
  const [active, stats, songRows, sectionRows] = await Promise.all([
    getActiveSession(),
    getTimezone().then(getPracticeStats),
    db.select({ id: songs.id, title: songs.title }).from(songs).orderBy(asc(songs.id)),
    db
      .select({ id: songSections.id, songId: songSections.songId, name: songSections.name })
      .from(songSections)
      .orderBy(asc(songSections.position)),
  ]);

  return (
    <PracticeRoom
      active={active ? { id: active.id, startedAt: active.startedAt.toISOString() } : null}
      todayMinutes={stats.todayMinutes}
      goalMinutes={stats.goalMinutes}
      songs={songRows.map((song) => ({ ...song, sections: sectionRows.filter((section) => section.songId === song.id) }))}
    />
  );
}
