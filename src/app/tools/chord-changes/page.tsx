import { asc, desc, eq } from "drizzle-orm";
import { getDb } from "@/db";
import { drillResults, songSections, songs } from "@/db/schema";
import { PageHeader } from "@/components/ui";
import { mergePairs, rankPairs, todaysChanges } from "@/lib/change-rotation";
import { chordPairsFromSections, playablePairs } from "@/lib/chord-pairs";
import { dayKey } from "@/lib/time";
import { getTimezone } from "@/lib/timezone";
import { ChordChangeDrill } from "./chord-change-drill";

export const metadata = { title: "One-minute changes" };

export default async function ChordChangesPage() {
  const [db, timeZone] = await Promise.all([getDb(), getTimezone()]);
  const [results, songRows, sectionRows] = await Promise.all([
    db.select().from(drillResults).where(eq(drillResults.type, "chord-change")).orderBy(desc(drillResults.createdAt)),
    db.select().from(songs).orderBy(asc(songs.id)),
    db.select().from(songSections).orderBy(asc(songSections.position)),
  ]);

  const groups = songRows
    .map((song) => ({
      title: song.title,
      pairs: playablePairs(chordPairsFromSections(sectionRows.filter((section) => section.songId === song.id))),
    }))
    .filter((group) => group.pairs.length > 0);

  const ranked = rankPairs(mergePairs(groups), results, dayKey(new Date(), timeZone), timeZone);

  return (
    <div>
      <PageHeader
        eyebrow="Tools"
        title="One-minute changes"
        subtitle="Strum once, switch, strum once, switch — for 60 seconds. Only count changes where every string rings."
      />
      <ChordChangeDrill
        ranked={ranked}
        todays={todaysChanges(ranked)}
        songTitles={groups.map((group) => group.title)}
        results={results.map((result) => ({
          id: result.id,
          key: result.key,
          score: result.score,
          createdAt: result.createdAt.toISOString(),
        }))}
      />
    </div>
  );
}
