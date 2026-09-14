import { eq } from "drizzle-orm";
import { getDb } from "@/db";
import { settings } from "@/db/schema";
import { Card, PageHeader, ProgressBar, Stat, cn } from "@/components/ui";
import { getBadges, getPracticeStats } from "@/lib/stats";
import { daysBetween, formatMinutes } from "@/lib/time";
import { getTimezone } from "@/lib/timezone";

export const metadata = { title: "Milestones" };

function formatProgress(value: number) {
  return Number.isInteger(value) ? String(value) : value.toFixed(1);
}

export default async function MilestonesPage() {
  const timeZone = await getTimezone();
  const db = await getDb();
  const stats = await getPracticeStats(timeZone);
  const [badges, [settingsRow]] = await Promise.all([getBadges(stats), db.select().from(settings).where(eq(settings.id, 1))]);
  const earned = badges.filter((badge) => badge.earned);
  const daysLeft = settingsRow?.performanceDate ? daysBetween(stats.today, settingsRow.performanceDate) : null;

  return (
    <div className="space-y-6">
      <PageHeader title="Milestones" subtitle={`${earned.length} of ${badges.length} earned — keep showing up.`} />

      {daysLeft !== null && (
        <div className="rounded-2xl border border-rose/30 bg-rose-soft p-5 text-rose">
          {daysLeft > 0 ? (
            <>
              <span className="font-display text-4xl font-semibold">{daysLeft}</span>{" "}
              <span className="text-lg">{daysLeft === 1 ? "day" : "days"} until {settingsRow?.performanceNote || "the big day"} ♥</span>
            </>
          ) : daysLeft === 0 ? (
            <span className="font-display text-2xl font-semibold">Today&apos;s the day — {settingsRow?.performanceNote || "you've got this"} ♥</span>
          ) : (
            <span className="text-lg">{settingsRow?.performanceNote || "The big day"} was {Math.abs(daysLeft)} days ago ♥</span>
          )}
        </div>
      )}

      <Card>
        <div className="grid grid-cols-2 gap-5 md:grid-cols-4">
          <Stat label="Total practice" value={formatMinutes(stats.totalMinutes)} />
          <Stat label="Sessions" value={stats.totalSessions} />
          <Stat label="Longest streak" value={`${stats.longestStreak}d`} hint={`current ${stats.currentStreak}d`} />
          <Stat label="Goal days" value={stats.goalDays} hint={`${stats.goalMinutes}+ min`} />
        </div>
      </Card>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {badges.map((badge) => (
          <div
            key={badge.id}
            className={cn(
              "rounded-2xl border p-4 shadow-sm",
              badge.earned ? "border-accent/40 bg-accent-soft" : "border-border bg-surface",
            )}
          >
            <div className="flex items-start gap-3">
              <div className={cn("text-3xl", !badge.earned && "opacity-40 grayscale")}>{badge.emoji}</div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-2">
                  <h3 className="font-medium">{badge.title}</h3>
                  {badge.earned && <span className="text-sm font-medium text-good">Earned ✓</span>}
                </div>
                <p className="text-sm text-ink-2">{badge.description}</p>
              </div>
            </div>
            {!badge.earned && (
              <div className="mt-3 flex items-center gap-2">
                <ProgressBar value={badge.progress} max={badge.target} />
                <span className="shrink-0 text-xs tabular-nums text-ink-3">
                  {formatProgress(badge.progress)} / {badge.target}
                </span>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
