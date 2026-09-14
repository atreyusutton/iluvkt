import Link from "next/link";
import { asc } from "drizzle-orm";
import { getDb } from "@/db";
import { songSections, songs } from "@/db/schema";
import { ButtonLink, Card, EmptyState, PageHeader, Pill, ProgressBar } from "@/components/ui";

export const metadata = { title: "Songs" };

export default async function SongsPage() {
  const db = await getDb();
  const [songRows, sectionRows] = await Promise.all([
    db.select().from(songs).orderBy(asc(songs.id)),
    db.select().from(songSections),
  ]);

  return (
    <div className="space-y-6">
      <PageHeader title="Songs" subtitle="Chord sheets, play-alongs, picking patterns and tutorials." action={<ButtonLink href="/songs/new">+ Add song</ButtonLink>} />
      {songRows.length === 0 ? (
        <EmptyState title="No songs yet"><Link href="/songs/new" className="text-accent underline">Add one</Link></EmptyState>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {songRows.map((song) => {
            const sections = sectionRows.filter((section) => section.songId === song.id);
            const score = sections.reduce((sum, s) => sum + (s.status === "nailed" ? 2 : s.status === "okay" ? 1 : 0), 0);
            return (
              <Link key={song.id} href={`/songs/${song.id}`}>
                <Card className="h-full transition hover:border-accent/50 hover:shadow-md">
                  <div className="text-sm text-ink-3">{song.artist}</div>
                  <h2 className="font-display text-2xl font-semibold">{song.title}</h2>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {song.capo > 0 && <Pill tone="accent">Capo {song.capo}</Pill>}
                    <Pill>{song.targetBpm} BPM</Pill>
                    {song.pickingPattern && <Pill tone="rose">Fingerpicked</Pill>}
                    <Pill>{sections.length} sections</Pill>
                  </div>
                  <div className="mt-5 flex items-center gap-3">
                    <ProgressBar value={score} max={Math.max(1, sections.length * 2)} tone="rose" />
                    <span className="text-sm tabular-nums text-ink-3">{Math.round((score / Math.max(1, sections.length * 2)) * 100)}%</span>
                  </div>
                </Card>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
