import Link from "next/link";
import { desc, eq } from "drizzle-orm";
import { getDb } from "@/db";
import { practiceSessions, settings, songSections, songs } from "@/db/schema";
import { PracticeHeatmap } from "@/components/practice-heatmap";
import { ButtonLink, Card, CardTitle, EmptyState, Pill, ProgressBar, ProgressRing, Stat } from "@/components/ui";
import { WeekChart } from "@/components/week-chart";
import { getBadges, getPracticeStats } from "@/lib/stats";
import { daysBetween, formatDate, formatMinutes } from "@/lib/time";
import { getTimezone } from "@/lib/timezone";

function greeting(timeZone: string) {
  const hour = Number(new Intl.DateTimeFormat("en-US", { hour: "numeric", hourCycle: "h23", timeZone }).format(new Date()));
  if (hour < 12) return "Good morning";
  if (hour < 18) return "Good afternoon";
  return "Good evening";
}

export default async function HomePage() {
  const timeZone = await getTimezone();
  const db = await getDb();
  const stats = await getPracticeStats(timeZone);
  const [badges, [settingsRow], [latestJournal], [firstSong]] = await Promise.all([
    getBadges(stats),
    db.select().from(settings).where(eq(settings.id, 1)),
    db
      .select()
      .from(practiceSessions)
      .where(eq(practiceSessions.status, "completed"))
      .orderBy(desc(practiceSessions.startedAt))
      .limit(1),
    db.select().from(songs).orderBy(songs.id).limit(1),
  ]);
  const sections = firstSong
    ? await db.select().from(songSections).where(eq(songSections.songId, firstSong.id)).orderBy(songSections.position)
    : [];

  const remaining = Math.max(0, stats.goalMinutes - stats.todayMinutes);
  const goalHit = remaining === 0;
  const earned = badges.filter((badge) => badge.earned);
  const nextBadges = badges.filter((badge) => !badge.earned).sort((a, b) => b.progress / b.target - a.progress / a.target).slice(0, 3);
  const daysUntilPerformance = settingsRow?.performanceDate ? daysBetween(stats.today, settingsRow.performanceDate) : null;
  const sectionScore = sections.reduce((sum, s) => sum + (s.status === "nailed" ? 2 : s.status === "okay" ? 1 : 0), 0);

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-ink-3">{formatDate(new Date(), timeZone, { weekday: "long", month: "long", day: "numeric" })}</p>
          <h1 className="font-display text-3xl font-semibold tracking-tight md:text-4xl">
            {greeting(timeZone)}
            {settingsRow?.playingFor ? <span className="text-rose"> ♥</span> : null}
          </h1>
        </div>
        <ButtonLink href="/practice" size="lg">
          {stats.todayMinutes > 0 ? "Keep practicing" : "Start today's practice"}
        </ButtonLink>
      </header>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="flex flex-col items-center justify-center gap-3 text-center lg:row-span-2">
          <ProgressRing value={stats.todayMinutes} max={stats.goalMinutes} size={184} stroke={14}>
            <div>
              <div className="font-display text-4xl font-semibold tabular-nums">{Math.floor(stats.todayMinutes)}</div>
              <div className="text-sm text-ink-3">of {stats.goalMinutes} min today</div>
            </div>
          </ProgressRing>
          <p className="text-sm text-ink-2">
            {goalHit ? "Goal done for today. Anything more is a bonus 🎉" : `${Math.ceil(remaining)} minutes to go`}
          </p>
          <div className="mt-2 grid w-full grid-cols-2 gap-3 border-t border-border pt-4">
            <Stat label="Streak" value={`${stats.currentStreak}🔥`} hint={`best ${stats.longestStreak}`} />
            <Stat label="Goal days" value={stats.goalDays} hint={`of ${stats.daysPracticed} practiced`} />
          </div>
        </Card>

        <Card className="lg:col-span-2">
          <div className="grid gap-6 sm:grid-cols-3">
            <Stat label="Total on iluvkt" value={`${Math.round(stats.totalMinutes).toLocaleString()} min`} hint={formatMinutes(stats.totalMinutes)} />
            <Stat label="Sessions" value={stats.totalSessions} />
            <Stat
              label="Average session"
              value={stats.totalSessions ? formatMinutes(stats.totalMinutes / stats.totalSessions) : "—"}
            />
          </div>
        </Card>

        <Card className="lg:col-span-2">
          <CardTitle>This week</CardTitle>
          <WeekChart days={stats.last7} goalMinutes={stats.goalMinutes} />
        </Card>
      </div>

      <Card>
        <CardTitle>Practice calendar</CardTitle>
        <PracticeHeatmap byDay={stats.byDay} today={stats.today} goalMinutes={stats.goalMinutes} />
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardTitle action={<Link href="/journal" className="text-sm text-accent hover:underline">All entries</Link>}>
            Latest journal
          </CardTitle>
          {!latestJournal ? (
            <EmptyState title="No sessions yet">Finish a practice session and your AI journal entry shows up here.</EmptyState>
          ) : latestJournal.journal ? (
            <Link href={`/journal/${latestJournal.id}`} className="block space-y-2 rounded-xl p-1 hover:bg-surface-2">
              <div className="flex items-center gap-2 text-sm text-ink-3">
                {formatDate(latestJournal.startedAt, timeZone)} · {formatMinutes(latestJournal.durationSeconds / 60)}
              </div>
              <h3 className="font-display text-xl font-semibold">{latestJournal.journal.title}</h3>
              <p className="text-ink-2">{latestJournal.journal.progress}</p>
              {latestJournal.journal.focusNext[0] && (
                <p className="text-sm">
                  <span className="font-medium text-accent">Next up:</span> {latestJournal.journal.focusNext[0]}
                </p>
              )}
            </Link>
          ) : (
            <Link href={`/journal/${latestJournal.id}`} className="block rounded-xl p-1 hover:bg-surface-2">
              <div className="text-sm text-ink-3">
                {formatDate(latestJournal.startedAt, timeZone)} · {formatMinutes(latestJournal.durationSeconds / 60)}
              </div>
              <p className="mt-2 text-ink-2">
                {latestJournal.journalStatus === "error" ? "Journal failed to generate — tap to retry." : latestJournal.journalError ?? "Writing your journal entry…"}
              </p>
            </Link>
          )}
        </Card>

        <Card>
          {firstSong ? (
            <>
              <CardTitle action={<Link href={`/songs/${firstSong.id}`} className="text-sm text-accent hover:underline">Open song</Link>}>
                {firstSong.title}
              </CardTitle>
              <div className="mb-4 flex items-center gap-3">
                <div className="flex-1">
                  <ProgressBar value={sectionScore} max={sections.length * 2} tone="rose" />
                </div>
                <span className="text-sm tabular-nums text-ink-3">
                  {Math.round((sectionScore / Math.max(1, sections.length * 2)) * 100)}%
                </span>
              </div>
              <ul className="space-y-2">
                {sections.map((section) => (
                  <li key={section.id} className="flex items-center justify-between gap-3 text-sm">
                    <span>{section.name}</span>
                    <span className="flex items-center gap-2">
                      {section.bestBpm && <span className="tabular-nums text-ink-3">{section.bestBpm}/{firstSong.targetBpm} BPM</span>}
                      <Pill tone={section.status === "nailed" ? "good" : section.status === "okay" ? "accent" : "neutral"}>{section.status}</Pill>
                    </span>
                  </li>
                ))}
              </ul>
            </>
          ) : (
            <EmptyState title="No songs yet">
              <Link href="/songs" className="text-accent underline">Add your first song</Link>
            </EmptyState>
          )}
          {daysUntilPerformance !== null && daysUntilPerformance >= 0 && (
            <div className="mt-5 rounded-xl bg-rose-soft px-4 py-3 text-sm text-rose">
              <span className="font-display text-2xl font-semibold">{daysUntilPerformance}</span>{" "}
              {daysUntilPerformance === 1 ? "day" : "days"} until {settingsRow?.performanceNote || "the big day"} ♥
            </div>
          )}
        </Card>
      </div>

      <Card>
        <CardTitle action={<Link href="/milestones" className="text-sm text-accent hover:underline">{earned.length}/{badges.length} earned</Link>}>
          Next milestones
        </CardTitle>
        <div className="grid gap-4 sm:grid-cols-3">
          {nextBadges.map((badge) => (
            <div key={badge.id} className="rounded-xl bg-surface-2 p-4">
              <div className="text-2xl">{badge.emoji}</div>
              <div className="mt-1 font-medium">{badge.title}</div>
              <div className="mb-3 text-sm text-ink-3">{badge.description}</div>
              <ProgressBar value={badge.progress} max={badge.target} />
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
