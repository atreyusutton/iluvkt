import Link from "next/link";
import { desc, eq } from "drizzle-orm";
import { getDb } from "@/db";
import { practiceSessions, songs } from "@/db/schema";
import { EmptyState, PageHeader, Pill } from "@/components/ui";
import { formatDate, formatMinutes } from "@/lib/time";
import { getTimezone } from "@/lib/timezone";
import { ManualLogForm } from "./manual-log-form";

export const metadata = { title: "Journal" };

export default async function JournalPage({ searchParams }: PageProps<"/journal">) {
  const { log } = await searchParams;
  const timeZone = await getTimezone();
  const db = await getDb();
  const [sessions, songRows] = await Promise.all([
    db
      .select()
      .from(practiceSessions)
      .where(eq(practiceSessions.status, "completed"))
      .orderBy(desc(practiceSessions.startedAt)),
    db.select({ id: songs.id, title: songs.title }).from(songs).orderBy(songs.id),
  ]);
  const songTitles = new Map(songRows.map((song) => [song.id, song.title]));

  const groups = new Map<string, typeof sessions>();
  for (const session of sessions) {
    const month = new Intl.DateTimeFormat("en-US", { month: "long", year: "numeric", timeZone }).format(session.startedAt);
    groups.set(month, [...(groups.get(month) ?? []), session]);
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Practice journal"
        subtitle="Every session, with an AI write-up of what you worked on and how you're progressing."
        action={<ManualLogForm songs={songRows} initiallyOpen={log === "1"} />}
      />

      {sessions.length === 0 ? (
        <EmptyState title="No entries yet">
          Finish a session on the <Link href="/practice" className="text-accent underline">Practice</Link> page, or log one manually.
        </EmptyState>
      ) : (
        [...groups.entries()].map(([month, monthSessions]) => {
          const monthMinutes = monthSessions.reduce((sum, s) => sum + s.durationSeconds / 60, 0);
          return (
            <section key={month} className="space-y-3">
              <div className="flex items-baseline justify-between">
                <h2 className="font-display text-xl font-semibold">{month}</h2>
                <span className="text-sm text-ink-3">
                  {monthSessions.length} sessions · {formatMinutes(monthMinutes)}
                </span>
              </div>
              <ul className="space-y-3">
                {monthSessions.map((session) => (
                  <li key={session.id}>
                    <Link
                      href={`/journal/${session.id}`}
                      className="block rounded-2xl border border-border bg-surface p-4 shadow-sm transition hover:border-accent/50 hover:shadow-md"
                    >
                      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-ink-3">
                        <span className="font-medium text-ink-2">{formatDate(session.startedAt, timeZone)}</span>
                        <span>{formatMinutes(session.durationSeconds / 60)}</span>
                        {session.kind === "manual" && <Pill>manual</Pill>}
                        {session.songId && songTitles.get(session.songId) && <span>♪ {songTitles.get(session.songId)}</span>}
                        {session.rating && (
                          <span className="text-accent" aria-label={`Rated ${session.rating} of 5`}>
                            {"★".repeat(session.rating)}
                            <span className="text-border">{"★".repeat(5 - session.rating)}</span>
                          </span>
                        )}
                      </div>
                      <h3 className="mt-1 font-display text-lg font-semibold">
                        {session.journal?.title ??
                          (session.journalStatus === "error" || session.journalError ? (
                            <span className="text-ink-3">Journal not written yet</span>
                          ) : (
                            <span className="text-ink-3">Writing journal…</span>
                          ))}
                      </h3>
                      {session.journal && <p className="mt-1 line-clamp-2 text-sm text-ink-2">{session.journal.whatIPracticed}</p>}
                      {session.focusAreas.length > 0 && (
                        <div className="mt-2 flex flex-wrap gap-1.5">
                          {session.focusAreas.map((area) => (
                            <Pill key={area} tone="accent">{area}</Pill>
                          ))}
                        </div>
                      )}
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          );
        })
      )}
    </div>
  );
}
