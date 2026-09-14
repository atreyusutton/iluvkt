"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { elapsedMs, usePracticeState } from "@/lib/practice-store";
import { formatClock } from "@/lib/time";
import { useNow } from "@/lib/use-now";

/** Shows the running session timer everywhere except the practice page itself. */
export function SessionPill({ floating = false }: { floating?: boolean }) {
  const state = usePracticeState();
  const pathname = usePathname();
  const now = useNow(1000, Boolean(state?.runningSince));
  if (!state || pathname === "/practice") return null;

  const running = Boolean(state.runningSince);
  return (
    <Link
      href="/practice"
      className={
        floating
          ? "fixed bottom-20 right-4 z-40 flex items-center gap-2 rounded-full bg-ink px-4 py-2 text-sm font-medium text-bg shadow-lg md:hidden"
          : "mx-1 flex items-center gap-2 rounded-xl bg-ink px-3 py-2 text-sm font-medium text-bg"
      }
    >
      <span className={running ? "h-2 w-2 animate-pulse rounded-full bg-rose" : "h-2 w-2 rounded-full bg-ink-3"} />
      <span className="tabular-nums">{formatClock(elapsedMs(state, now) / 1000)}</span>
      <span className="text-bg/70">{running ? "practicing" : "paused"}</span>
    </Link>
  );
}
