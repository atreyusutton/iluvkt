import Link from "next/link";
import { notFound } from "next/navigation";
import { asc, eq, inArray } from "drizzle-orm";
import { getDb } from "@/db";
import { practiceSessions, recordings, songSections, songs } from "@/db/schema";
import { Card, CardTitle, PageHeader, Pill, Stat } from "@/components/ui";
import { formatClock, formatDate, formatMinutes } from "@/lib/time";
import { getTimezone } from "@/lib/timezone";
import { JournalPending, RetryJournalButton } from "./journal-status";
import { RecordingPlayer } from "@/components/recording-player";

export const metadata = { title: "Journal entry" };

export default async function JournalEntryPage({ params }: PageProps<"/journal/[id]">) {
  const { id } = await params;
  const sessionId = Number.parseInt(id, 10);
  if (!Number.isFinite(sessionId)) notFound();

  const timeZone = await getTimezone();
  const db = await getDb();
  const [session] = await db.select().from(practiceSessions).where(eq(practiceSessions.id, sessionId));
  if (!session) notFound();

  const [[song], sections, sessionRecordings] = await Promise.all([
    session.songId ? db.select().from(songs).where(eq(songs.id, session.songId)) : Promise.resolve([]),
    session.sectionIds.length
      ? db.select().from(songSections).where(inArray(songSections.id, session.sectionIds))
      : Promise.resolve([]),
    db.select().from(recordings).where(eq(recordings.sessionId, sessionId)).orderBy(asc(recordings.createdAt)),
  ]);

  const journal = session.journal;
  const failed = session.journalStatus === "error" || Boolean(session.journalError);

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow={
          <Link href="/journal" className="hover:text-accent">
            ← Journal
          </Link>
        }
        title={journal?.title ?? "Practice session"}
        subtitle={formatDate(session.startedAt, timeZone, {
          weekday: "long",
          month: "long",
          day: "numeric",
          year: "numeric",
          ...(session.kind === "timed" ? { hour: "numeric", minute: "2-digit" } : {}),
        })}
      />

      {session.status === "active" && (
        <div className="rounded-xl border border-warn/30 bg-warn-soft px-4 py-2 text-sm text-warn">
          This session is still running. <Link href="/practice" className="underline">Go to practice</Link>
        </div>
      )}

      <Card>
        <div className="grid grid-cols-2 gap-5 sm:grid-cols-4">
          <Stat label="Duration" value={formatMinutes(session.durationSeconds / 60)} hint={session.kind === "manual" ? "logged manually" : undefined} />
          <Stat label="Tempo" value={session.bpm ? `${session.bpm}` : "—"} hint={session.bpm ? "BPM" : undefined} />
          <Stat
            label="Rating"
            value={
              session.rating ? (
                <span className="text-accent">
                  {"★".repeat(session.rating)}
                  <span className="text-border">{"★".repeat(5 - session.rating)}</span>
                </span>
              ) : (
                "—"
              )
            }
          />
          <Stat label="Recordings" value={sessionRecordings.length} />
        </div>
        {(song || session.focusAreas.length > 0) && (
          <div className="mt-5 space-y-2 border-t border-border pt-4 text-sm">
            {song && (
              <div>
                <span className="text-ink-3">Song: </span>
                <Link href={`/songs/${song.id}`} className="font-medium hover:text-accent">
                  {song.title}
                </Link>
                {sections.length > 0 && <span className="text-ink-2"> · {sections.map((s) => s.name).join(", ")}</span>}
              </div>
            )}
            {session.focusAreas.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {session.focusAreas.map((area) => (
                  <Pill key={area} tone="accent">{area}</Pill>
                ))}
              </div>
            )}
          </div>
        )}
      </Card>

      {journal ? (
        <div className="grid gap-4 lg:grid-cols-2">
          <Card className="lg:col-span-2">
            <div className="mb-1 text-xs font-semibold uppercase tracking-wide text-ink-3">What I practiced</div>
            <p className="font-display text-lg leading-relaxed">{journal.whatIPracticed}</p>
          </Card>
          <Card>
            <CardTitle>How you&apos;re progressing</CardTitle>
            <p className="leading-relaxed text-ink-2">{journal.progress}</p>
          </Card>
          <Card>
            <CardTitle>Wins</CardTitle>
            <ul className="space-y-2">
              {journal.wins.map((win) => (
                <li key={win} className="flex gap-2 text-ink-2">
                  <span className="text-good">✓</span>
                  {win}
                </li>
              ))}
            </ul>
          </Card>
          <Card className="lg:col-span-2">
            <CardTitle>Focus next session</CardTitle>
            <ol className="space-y-2">
              {journal.focusNext.map((item, index) => (
                <li key={item} className="flex gap-3 text-ink-2">
                  <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-accent-soft text-xs font-semibold text-accent">
                    {index + 1}
                  </span>
                  {item}
                </li>
              ))}
            </ol>
          </Card>
          <div className="rounded-2xl bg-rose-soft px-5 py-4 text-rose lg:col-span-2">♥ {journal.encouragement}</div>
          {failed && (
            <div className="flex items-center gap-3 text-sm text-ink-3 lg:col-span-2">
              Last regeneration failed: {session.journalError} <RetryJournalButton sessionId={session.id} />
            </div>
          )}
        </div>
      ) : session.status === "completed" ? (
        <Card>
          <CardTitle>AI journal</CardTitle>
          {failed ? (
            <div className="space-y-3">
              <p className="text-ink-2">{session.journalError ?? "The journal couldn't be written."}</p>
              <RetryJournalButton sessionId={session.id} />
            </div>
          ) : (
            <JournalPending />
          )}
        </Card>
      ) : null}

      {session.notes && (
        <Card>
          <CardTitle>My notes</CardTitle>
          <p className="whitespace-pre-wrap text-ink-2">{session.notes}</p>
        </Card>
      )}

      {sessionRecordings.length > 0 && (
        <Card>
          <CardTitle action={<Link href="/recordings" className="text-sm text-accent hover:underline">All recordings</Link>}>
            Recordings
          </CardTitle>
          <ul className="space-y-4">
            {sessionRecordings.map((recording, index) => (
              <li key={recording.id} className="space-y-1">
                <div className="flex items-center justify-between text-sm">
                  <span className="font-medium">
                    {recording.starred && <span className="text-accent">★ </span>}
                    {recording.label || `Take ${index + 1}`}
                  </span>
                  <span className="tabular-nums text-ink-3">{formatClock(recording.durationSeconds)}</span>
                </div>
                <RecordingPlayer id={recording.id} mimeType={recording.mimeType} />
              </li>
            ))}
          </ul>
        </Card>
      )}
    </div>
  );
}
