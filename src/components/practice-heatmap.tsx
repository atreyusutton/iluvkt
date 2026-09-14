import { addDays } from "@/lib/time";

const LEVELS = ["var(--heat-0)", "var(--heat-1)", "var(--heat-2)", "var(--heat-3)", "var(--heat-4)"];
const WEEKDAYS = ["", "Mon", "", "Wed", "", "Fri", ""];

function level(minutes: number, goal: number) {
  if (minutes < 1) return 0;
  if (minutes < goal * 0.5) return 1;
  if (minutes < goal) return 2;
  if (minutes < goal * 2) return 3;
  return 4;
}

/** GitHub-style calendar of practice minutes, ending with the current week. */
export function PracticeHeatmap({
  byDay,
  today,
  goalMinutes,
  weeks = 20,
}: {
  byDay: Map<string, number>;
  today: string;
  goalMinutes: number;
  weeks?: number;
}) {
  const [year, month, day] = today.split("-").map(Number);
  const weekday = new Date(Date.UTC(year, month - 1, day)).getUTCDay();
  const start = addDays(today, -weekday - (weeks - 1) * 7);

  const columns = Array.from({ length: weeks }, (_, week) =>
    Array.from({ length: 7 }, (_, dayIndex) => {
      const key = addDays(start, week * 7 + dayIndex);
      return { key, minutes: byDay.get(key) ?? 0, future: key > today };
    }),
  );

  return (
    <div>
      <div className="overflow-x-auto pb-1">
        <div className="flex gap-[3px]">
          <div className="mr-1 grid grid-rows-7 gap-[3px] text-[10px] leading-none text-ink-3">
            {WEEKDAYS.map((label, index) => (
              <div key={index} className="flex h-3.5 items-center">{label}</div>
            ))}
          </div>
          {columns.map((column, index) => (
            <div key={index} className="grid grid-rows-7 gap-[3px]">
              {column.map((cell) => (
                <div
                  key={cell.key}
                  title={cell.future ? undefined : `${cell.key}: ${Math.round(cell.minutes)} min`}
                  className="h-3.5 w-3.5 rounded-[3px]"
                  style={{
                    background: cell.future ? "transparent" : LEVELS[level(cell.minutes, goalMinutes)],
                    outline: cell.key === today ? "1.5px solid var(--ink-2)" : undefined,
                  }}
                />
              ))}
            </div>
          ))}
        </div>
      </div>
      <div className="mt-3 flex items-center gap-1.5 text-xs text-ink-3">
        <span>Less</span>
        {LEVELS.map((color) => (
          <span key={color} className="h-3 w-3 rounded-[3px]" style={{ background: color }} />
        ))}
        <span>More</span>
        <span className="ml-3">Darkest = 2× your {goalMinutes}-min goal</span>
      </div>
    </div>
  );
}
