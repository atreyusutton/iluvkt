import type { DayTotal } from "@/lib/stats";

/** Last 7 days of minutes as bars, with a dashed line at the daily goal. */
export function WeekChart({ days, goalMinutes }: { days: DayTotal[]; goalMinutes: number }) {
  const maxMinutes = Math.max(goalMinutes * 1.25, ...days.map((d) => d.minutes));
  const goalPct = (goalMinutes / maxMinutes) * 100;

  return (
    <div>
      <div className="relative h-36">
        <div className="absolute inset-x-0 border-t border-dashed border-ink-3/60" style={{ bottom: `${goalPct}%` }}>
          <span className="absolute -top-4 right-0 text-[10px] text-ink-3">goal {goalMinutes}m</span>
        </div>
        <div className="absolute inset-0 grid grid-cols-7 items-end gap-2">
          {days.map((day) => {
            const pct = (day.minutes / maxMinutes) * 100;
            const hit = day.minutes >= goalMinutes;
            return (
              <div key={day.day} className="group relative flex h-full items-end justify-center">
                <div
                  className="w-full max-w-9 rounded-t-[4px] transition-all"
                  style={{ height: `${Math.max(pct, day.minutes > 0 ? 2 : 0)}%`, background: hit ? "var(--good)" : "var(--accent)" }}
                />
                <div className="pointer-events-none absolute bottom-full mb-1 hidden whitespace-nowrap rounded-md bg-ink px-2 py-1 text-xs text-bg group-hover:block">
                  {Math.round(day.minutes)} min
                </div>
              </div>
            );
          })}
        </div>
      </div>
      <div className="mt-2 grid grid-cols-7 gap-2 text-center text-xs text-ink-3">
        {days.map((day) => {
          const [y, m, d] = day.day.split("-").map(Number);
          const label = new Date(Date.UTC(y, m - 1, d)).toLocaleDateString("en-US", { weekday: "short", timeZone: "UTC" });
          return <div key={day.day}>{label.slice(0, 2)}</div>;
        })}
      </div>
    </div>
  );
}
