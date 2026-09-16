import { asc, desc, eq } from "drizzle-orm";
import { getDb } from "@/db";
import { drillResults, songSections, songs } from "@/db/schema";
import { PageHeader } from "@/components/ui";
import { chordPairsFromSections, playablePairs } from "@/lib/chord-pairs";
import { ChordChangeDrill } from "./chord-change-drill";

export const metadata = { title: "One-minute changes" };

export default async function ChordChangesPage() {
  const db = await getDb();
  const [results, songRows, sectionRows] = await Promise.all([
    db.select().from(drillResults).where(eq(drillResults.type, "chord-change")).orderBy(desc(drillResults.createdAt)),
    db.select().from(songs).orderBy(asc(songs.id)),
    db.select().from(songSections).orderBy(asc(songSections.position)),
  ]);

  const songGroups = songRows
    .map((song) => ({
      id: song.id,
      title: song.title,
      pairs: playablePairs(chordPairsFromSections(sectionRows.filter((section) => section.songId === song.id))),
    }))
    .filter((group) => group.pairs.length > 0);

  return (
    <div>
      <PageHeader
        eyebrow="Tools"
        title="One-minute changes"
        subtitle="Strum once, switch, strum once, switch — for 60 seconds. Only count changes where every string rings."
      />
      <ChordChangeDrill
        songGroups={songGroups}
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
