import { asc, desc, eq } from "drizzle-orm";
import { getDb } from "@/db";
import { drillResults, songSections, songs } from "@/db/schema";
import { mergePairs, rankPairs, todaysChanges } from "@/lib/change-rotation";
import { chordPairsFromSections, playablePairs } from "@/lib/chord-pairs";
import { buildRoutine } from "@/lib/daily-routine";
import { getActiveSession, getPracticeStats } from "@/lib/stats";
import { dayKey } from "@/lib/time";
import { getTimezone } from "@/lib/timezone";
import { PracticeRoom } from "./practice-room";

export const metadata = { title: "Practice" };

export default async function PracticePage() {
  const [db, timeZone] = await Promise.all([getDb(), getTimezone()]);
  const [active, stats, songRows, sectionRows, drills] = await Promise.all([
    getActiveSession(),
    getPracticeStats(timeZone),
    db
      .select({
        id: songs.id,
        title: songs.title,
        capo: songs.capo,
        targetBpm: songs.targetBpm,
        strummingPattern: songs.strummingPattern,
      })
      .from(songs)
      .orderBy(asc(songs.id)),
    db
      .select({
        id: songSections.id,
        songId: songSections.songId,
        name: songSections.name,
        bars: songSections.bars,
        status: songSections.status,
        bestBpm: songSections.bestBpm,
      })
      .from(songSections)
      .orderBy(asc(songSections.position)),
    db.select().from(drillResults).where(eq(drillResults.type, "chord-change")).orderBy(desc(drillResults.createdAt)),
  ]);

  const groups = songRows
    .map((song) => ({
      title: song.title,
      pairs: playablePairs(chordPairsFromSections(sectionRows.filter((section) => section.songId === song.id))),
    }))
    .filter((group) => group.pairs.length > 0);

  const today = dayKey(new Date(), timeZone);
  const todays = todaysChanges(rankPairs(mergePairs(groups), drills, today, timeZone));

  // The routine is built around one song: the first that still has work left in it.
  const sectionsOf = (songId: number) => sectionRows.filter((section) => section.songId === songId);
  const routineSong =
    songRows.find((song) => sectionsOf(song.id).some((section) => section.status !== "nailed")) ?? songRows[0] ?? null;

  const routine = buildRoutine({
    today,
    changes: todays.map((pair) => ({ first: pair.first, second: pair.second, doneToday: pair.doneToday })),
    song: routineSong
      ? {
          title: routineSong.title,
          capo: routineSong.capo,
          targetBpm: routineSong.targetBpm,
          strummingPattern: routineSong.strummingPattern,
          sections: sectionsOf(routineSong.id).map((section) => ({
            name: section.name,
            status: section.status,
            bestBpm: section.bestBpm,
          })),
        }
      : null,
  });

  return (
    <PracticeRoom
      active={active ? { id: active.id, startedAt: active.startedAt.toISOString() } : null}
      todayMinutes={stats.todayMinutes}
      goalMinutes={stats.goalMinutes}
      songs={songRows.map((song) => ({
        id: song.id,
        title: song.title,
        sections: sectionsOf(song.id).map((section) => ({ id: section.id, name: section.name })),
      }))}
      routine={routine}
    />
  );
}
