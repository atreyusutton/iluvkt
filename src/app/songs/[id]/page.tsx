import Link from "next/link";
import { notFound } from "next/navigation";
import { asc, desc, eq } from "drizzle-orm";
import { updateSongDetails } from "@/app/actions/songs";
import { ChordDiagram } from "@/components/chord-diagram";
import { TabView } from "@/components/tab-view";
import { TutorialVideos } from "@/components/tutorial-videos";
import { Button, Card, CardTitle, PageHeader, Pill } from "@/components/ui";
import { getDb } from "@/db";
import { recordings, songSections, songs } from "@/db/schema";
import { chordsInSheet } from "@/lib/chordpro";
import { formatClock, formatDate } from "@/lib/time";
import { getTimezone } from "@/lib/timezone";
import { getVideosWithBookmarks } from "@/lib/videos";
import { youtubeSearchUrl } from "@/lib/youtube";
import { ChordSheet } from "./chord-sheet";
import { PlayAlong } from "./play-along";
import { SectionsEditor } from "./sections-editor";
import { SongRecorder } from "./song-recorder";
import { SongTabs } from "./song-tabs";

export async function generateMetadata({ params }: PageProps<"/songs/[id]">) {
  const { id } = await params;
  const db = await getDb();
  const [song] = await db.select({ title: songs.title }).from(songs).where(eq(songs.id, Number(id) || 0));
  return { title: song?.title ?? "Song" };
}

export default async function SongPage({ params }: PageProps<"/songs/[id]">) {
  const { id } = await params;
  const songId = Number.parseInt(id, 10);
  if (!Number.isFinite(songId)) notFound();

  const db = await getDb();
  const [song] = await db.select().from(songs).where(eq(songs.id, songId));
  if (!song) notFound();

  const timeZone = await getTimezone();
  const [sections, videoList, songRecordings] = await Promise.all([
    db.select().from(songSections).where(eq(songSections.songId, songId)).orderBy(asc(songSections.position)),
    getVideosWithBookmarks({ songId }),
    db.select().from(recordings).where(eq(recordings.songId, songId)).orderBy(desc(recordings.createdAt)).limit(5),
  ]);

  const chordNames = [...new Set([...sections.flatMap((section) => section.bars.map((bar) => bar.chord)), ...chordsInSheet(song.chordSheet)])];
  const updateDetails = updateSongDetails.bind(null, song.id);

  return (
    <div>
      <PageHeader
        eyebrow={<Link href="/songs" className="hover:underline">← Songs</Link>}
        title={song.title}
        subtitle={song.artist}
        action={
          <div className="flex flex-wrap gap-2">
            {song.capo > 0 && <Pill tone="accent">Capo {song.capo}</Pill>}
            <Pill>Target {song.targetBpm} BPM</Pill>
            <Pill>{song.beatsPerBar}/4</Pill>
          </div>
        }
      />

      <SongTabs
        tabs={[
          {
            id: "sheet",
            label: "Chord sheet",
            content: (
              <div className="grid gap-6 lg:grid-cols-[1fr_280px]">
                <Card>
                  <ChordSheet songId={song.id} initial={song.chordSheet} />
                </Card>
                <div className="space-y-4">
                  <Card>
                    <CardTitle>Chords in this song</CardTitle>
                    <div className="grid grid-cols-3 gap-2 lg:grid-cols-2">
                      {chordNames.map((name) => (
                        <ChordDiagram key={name} chord={name} size={96} />
                      ))}
                    </div>
                    <Link href="/tools/chord-changes" className="mt-3 inline-block text-sm text-accent hover:underline">
                      Drill the changes →
                    </Link>
                  </Card>
                  {song.notes && (
                    <Card>
                      <CardTitle>Notes</CardTitle>
                      <p className="whitespace-pre-line text-sm text-ink-2">{song.notes}</p>
                    </Card>
                  )}
                </div>
              </div>
            ),
          },
          {
            id: "play",
            label: "Play-along",
            content: (
              <PlayAlong
                songId={song.id}
                sections={sections}
                beatsPerBar={song.beatsPerBar}
                targetBpm={song.targetBpm}
                pattern={song.pickingPattern}
              />
            ),
          },
          {
            id: "picking",
            label: "Picking pattern",
            content: (
              <div className="space-y-4">
                {song.pickingPattern ? (
                  <>
                    <Card>
                      <CardTitle>{song.pickingPattern.name}</CardTitle>
                      <p className="text-ink-2">{song.pickingPattern.description}</p>
                      <p className="mt-3 text-sm text-ink-3">
                        Letters under the tab: <b>T</b> thumb, <b>I</b> index, <b>M</b> middle, <b>R</b> ring. Numbers are frets (relative to the capo).
                      </p>
                    </Card>
                    <div className="grid gap-4 md:grid-cols-2">
                      {chordNames.map((name) => (
                        <Card key={name} className="flex items-center gap-4">
                          <ChordDiagram chord={name} size={80} />
                          <TabView chordName={name} steps={song.pickingPattern!.steps} beatsPerBar={song.beatsPerBar} />
                        </Card>
                      ))}
                    </div>
                  </>
                ) : (
                  <Card><p className="text-ink-2">This song isn&apos;t fingerpicked.</p></Card>
                )}
                {song.strummingPattern && (
                  <Card>
                    <CardTitle>Strumming</CardTitle>
                    <p className="font-mono text-ink-2">{song.strummingPattern}</p>
                  </Card>
                )}
              </div>
            ),
          },
          {
            id: "sections",
            label: "Sections",
            content: <SectionsEditor songId={song.id} sections={sections} beatsPerBar={song.beatsPerBar} targetBpm={song.targetBpm} />,
          },
          {
            id: "tutorials",
            label: "Tutorials",
            content: (
              <Card>
                <CardTitle>Tutorial videos</CardTitle>
                <p className="mb-4 text-sm text-ink-2">For watching and reference. Bookmark the moments you want to rewatch.</p>
                <TutorialVideos
                  videos={videoList}
                  target={{ songId: song.id }}
                  searchHint={{
                    label: "Search YouTube for a lesson",
                    url: youtubeSearchUrl(`${song.title} ${song.artist} guitar lesson`),
                  }}
                />
              </Card>
            ),
          },
          {
            id: "record",
            label: "Record",
            content: (
              <div className="grid gap-6 lg:grid-cols-2">
                <Card>
                  <CardTitle>Record a take</CardTitle>
                  <p className="mb-4 text-sm text-ink-2">If a practice session is running, the take is attached to it.</p>
                  <SongRecorder songId={song.id} />
                </Card>
                <Card>
                  <CardTitle action={<Link href="/recordings" className="text-sm text-accent hover:underline">All recordings</Link>}>Recent takes</CardTitle>
                  {songRecordings.length === 0 ? (
                    <p className="text-sm text-ink-3">No takes of this song yet.</p>
                  ) : (
                    <ul className="space-y-4">
                      {songRecordings.map((recording) => (
                        <li key={recording.id}>
                          <div className="mb-1 flex justify-between text-sm">
                            <span>{recording.starred ? "★ " : ""}{recording.label || "Untitled take"}</span>
                            <span className="text-ink-3">
                              {formatDate(recording.createdAt, timeZone)} · {formatClock(recording.durationSeconds)}
                            </span>
                          </div>
                          <audio controls preload="none" src={`/api/recordings/${recording.id}/audio`} className="w-full" />
                        </li>
                      ))}
                    </ul>
                  )}
                </Card>
              </div>
            ),
          },
          {
            id: "details",
            label: "Details",
            content: (
              <Card className="max-w-2xl">
                <form action={updateDetails} className="space-y-4">
                  <div className="grid gap-4 sm:grid-cols-2">
                    <label className="block"><span className="label">Title</span><input name="title" defaultValue={song.title} className="field" /></label>
                    <label className="block"><span className="label">Artist</span><input name="artist" defaultValue={song.artist} className="field" /></label>
                    <label className="block"><span className="label">Capo</span><input name="capo" type="number" min={0} max={12} defaultValue={song.capo} className="field" /></label>
                    <label className="block"><span className="label">Target BPM</span><input name="targetBpm" type="number" min={30} max={260} defaultValue={song.targetBpm} className="field" /></label>
                    <label className="block"><span className="label">Beats per bar</span><input name="beatsPerBar" type="number" min={2} max={12} defaultValue={song.beatsPerBar} className="field" /></label>
                    <label className="block"><span className="label">Tuning</span><input name="tuning" defaultValue={song.tuning} className="field" /></label>
                  </div>
                  <label className="block"><span className="label">Strumming pattern</span><input name="strummingPattern" defaultValue={song.strummingPattern ?? ""} className="field" /></label>
                  <label className="block"><span className="label">Notes</span><textarea name="notes" rows={5} defaultValue={song.notes} className="field" /></label>
                  <Button type="submit">Save details</Button>
                </form>
              </Card>
            ),
          },
        ]}
      />
    </div>
  );
}
