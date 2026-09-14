import Link from "next/link";
import { desc } from "drizzle-orm";
import { getDb } from "@/db";
import { recordings, songs } from "@/db/schema";
import { Card, CardTitle, EmptyState, PageHeader, cn } from "@/components/ui";
import { dayKey, formatClock, formatDate } from "@/lib/time";
import { getTimezone } from "@/lib/timezone";
import { RecordingPlayer } from "@/components/recording-player";
import { RecordingItem } from "./recording-item";

export const metadata = { title: "Recordings" };

export default async function RecordingsPage({ searchParams }: PageProps<"/recordings">) {
  const { filter } = await searchParams;
  const starredOnly = filter === "starred";
  const timeZone = await getTimezone();
  const db = await getDb();

  const [all, songRows] = await Promise.all([
    db.select().from(recordings).orderBy(desc(recordings.createdAt)),
    db.select({ id: songs.id, title: songs.title }).from(songs),
  ]);
  const songTitles = new Map(songRows.map((song) => [song.id, song.title]));
  const visible = starredOnly ? all.filter((recording) => recording.starred) : all;

  const groups = new Map<string, typeof visible>();
  for (const recording of visible) {
    const key = dayKey(recording.createdAt, timeZone);
    groups.set(key, [...(groups.get(key) ?? []), recording]);
  }

  const first = all.at(-1);
  const latest = all[0];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Recordings"
        subtitle="Hear how far you've come. Record from the Practice page."
        action={
          <div className="flex rounded-xl border border-border bg-surface p-1 text-sm">
            {[
              { label: `All (${all.length})`, href: "/recordings", active: !starredOnly },
              { label: `★ Starred (${all.filter((r) => r.starred).length})`, href: "/recordings?filter=starred", active: starredOnly },
            ].map((tab) => (
              <Link
                key={tab.href}
                href={tab.href}
                className={cn("rounded-lg px-3 py-1.5 font-medium", tab.active ? "bg-accent-soft text-accent" : "text-ink-2")}
              >
                {tab.label}
              </Link>
            ))}
          </div>
        }
      />

      {all.length >= 2 && first && latest && (
        <Card>
          <CardTitle>Then vs now</CardTitle>
          <div className="grid gap-4 md:grid-cols-2">
            {[
              { title: "Your first recording", recording: first },
              { title: "Your latest recording", recording: latest },
            ].map(({ title, recording }) => (
              <div key={title} className="rounded-xl bg-surface-2 p-4">
                <div className="text-xs font-semibold uppercase tracking-wide text-ink-3">{title}</div>
                <div className="mb-3 mt-1 flex items-baseline justify-between gap-2">
                  <span className="font-medium">{recording.label || formatDate(recording.createdAt, timeZone)}</span>
                  <span className="text-sm tabular-nums text-ink-3">
                    {formatDate(recording.createdAt, timeZone, { year: "numeric" })} · {formatClock(recording.durationSeconds)}
                  </span>
                </div>
                <RecordingPlayer id={recording.id} mimeType={recording.mimeType} />
              </div>
            ))}
          </div>
        </Card>
      )}

      {visible.length === 0 ? (
        <EmptyState title={starredOnly ? "No starred takes yet" : "No recordings yet"}>
          {starredOnly ? (
            "Star your best takes so they're easy to find."
          ) : (
            <>
              Start a session on the <Link href="/practice" className="text-accent underline">Practice</Link> page and hit record.
            </>
          )}
        </EmptyState>
      ) : (
        <div className="space-y-6">
          {[...groups.entries()].map(([day, dayRecordings]) => (
            <section key={day}>
              <h2 className="mb-3 font-display text-lg font-semibold">
                {formatDate(dayRecordings[0].createdAt, timeZone, { weekday: "long", month: "long", day: "numeric", year: "numeric" })}
              </h2>
              <ul className="space-y-3 border-l-2 border-border pl-4">
                {dayRecordings.map((recording) => (
                  <RecordingItem
                    key={recording.id}
                    recording={{
                      id: recording.id,
                      label: recording.label,
                      starred: recording.starred,
                      durationSeconds: recording.durationSeconds,
                      sessionId: recording.sessionId,
                      songId: recording.songId,
                      mimeType: recording.mimeType,
                      time: formatDate(recording.createdAt, timeZone, { weekday: undefined, month: undefined, day: undefined, hour: "numeric", minute: "2-digit" }),
                    }}
                    songTitle={recording.songId ? songTitles.get(recording.songId) ?? null : null}
                  />
                ))}
              </ul>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
