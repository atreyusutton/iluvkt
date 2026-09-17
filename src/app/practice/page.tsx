import { asc, desc, eq } from "drizzle-orm";
import { getDb } from "@/db";
import { drillResults, songSections, songs } from "@/db/schema";
import { mergePairs, rankPairs, todaysChanges } from "@/lib/change-rotation";
import { chordPairsFromSections, playablePairs } from "@/lib/chord-pairs";
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
    db.select({ id: songs.id, title: songs.title }).from(songs).orderBy(asc(songs.id)),
    db
      .select({ id: songSections.id, songId: songSections.songId, name: songSections.name, bars: songSections.bars })
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

  const todays = todaysChanges(rankPairs(mergePairs(groups), drills, dayKey(new Date(), timeZone), timeZone));

  return (
    <PracticeRoom
      active={active ? { id: active.id, startedAt: active.startedAt.toISOString() } : null}
      todayMinutes={stats.todayMinutes}
      goalMinutes={stats.goalMinutes}
      songs={songRows.map((song) => ({
        ...song,
        sections: sectionRows
          .filter((section) => section.songId === song.id)
          .map((section) => ({ id: section.id, name: section.name })),
      }))}
      todaysChanges={todays.map((pair) => ({
        key: pair.key,
        first: pair.first,
        second: pair.second,
        doneToday: pair.doneToday,
      }))}
    />
  );
}
