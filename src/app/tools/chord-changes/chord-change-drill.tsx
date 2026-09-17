"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { saveDrillResult } from "@/app/actions/misc";
import { ChordDiagram } from "@/components/chord-diagram";
import { Button, Card, CardTitle, cn, Pill } from "@/components/ui";
import { CHORDS } from "@/content/chords";
import { beep } from "@/lib/audio/metronome";
import { type PairProgress, pickReason, type Tier, TIER_LABELS } from "@/lib/change-rotation";
import { normalizePairKey, pairKey } from "@/lib/chord-pairs";

type Result = { id: number; key: string; score: number; createdAt: string };
type Phase = "idle" | "countdown" | "running" | "entering";

const DRILL_SECONDS = 60;

const TIER_ORDER: Tier[] = ["new", "building", "solid", "strong"];
const TIER_TONES: Record<Tier, "neutral" | "accent" | "good" | "warn"> = {
  new: "neutral",
  building: "warn",
  solid: "accent",
  strong: "good",
};

export function ChordChangeDrill({
  ranked,
  todays,
  songTitles,
  results,
}: {
  ranked: PairProgress[];
  todays: PairProgress[];
  songTitles: string[];
  results: Result[];
}) {
  const router = useRouter();
  const [first, setFirst] = useState(todays[0]?.first ?? "C");
  const [second, setSecond] = useState(todays[0]?.second ?? "G");
  const [phase, setPhase] = useState<Phase>("idle");
  const [countdown, setCountdown] = useState(3);
  const [secondsLeft, setSecondsLeft] = useState(DRILL_SECONDS);
  const [score, setScore] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [runningSet, setRunningSet] = useState(false);
  // Scores saved in this visit. `router.refresh()` lands after we've already advanced,
  // so the set needs to know what's done without waiting for the server to catch up.
  const [justDone, setJustDone] = useState<string[]>([]);
  const [pending, startTransition] = useTransition();
  const timerRef = useRef<number | null>(null);

  const key = pairKey(first, second);
  const history = results.filter((result) => normalizePairKey(result.key) === key);
  const best = history.reduce<number | null>((max, result) => (max === null || result.score > max ? result.score : max), null);
  const selectedPair = ranked.find((pair) => pair.key === key);

  const doneKeys = useMemo(
    () => new Set([...todays.filter((pair) => pair.doneToday).map((pair) => pair.key), ...justDone]),
    [todays, justDone],
  );
  const remaining = todays.filter((pair) => !doneKeys.has(pair.key));
  const doneCount = todays.length - remaining.length;
  const position = todays.findIndex((pair) => pair.key === key);

  const clearTimer = () => {
    if (timerRef.current !== null) window.clearInterval(timerRef.current);
    timerRef.current = null;
  };

  useEffect(() => clearTimer, []);

  const safeBeep = (frequency: number, duration?: number) => {
    try {
      beep(frequency, duration);
    } catch (err) {
      console.warn("Audio cue failed", err);
    }
  };

  const select = (pair: { first: string; second: string }) => {
    setFirst(pair.first);
    setSecond(pair.second);
  };

  const start = () => {
    clearTimer();
    setError(null);
    setScore("");
    setPhase("countdown");
    setCountdown(3);
    safeBeep(660);
    const countdownStart = Date.now();
    let shown = 3;
    timerRef.current = window.setInterval(() => {
      const elapsed = Math.floor((Date.now() - countdownStart) / 1000);
      if (elapsed < 3) {
        if (3 - elapsed !== shown) {
          shown = 3 - elapsed;
          safeBeep(660);
          setCountdown(shown);
        }
        return;
      }
      clearTimer();
      safeBeep(1320, 0.3);
      setPhase("running");
      const endAt = Date.now() + DRILL_SECONDS * 1000;
      setSecondsLeft(DRILL_SECONDS);
      timerRef.current = window.setInterval(() => {
        const left = Math.max(0, Math.ceil((endAt - Date.now()) / 1000));
        setSecondsLeft(left);
        if (left === 0) {
          clearTimer();
          safeBeep(440, 0.6);
          setPhase("entering");
        }
      }, 100);
    }, 100);
  };

  const startSet = () => {
    const next = remaining[0];
    if (!next) return;
    setRunningSet(true);
    select(next);
    start();
  };

  const cancel = () => {
    clearTimer();
    setPhase("idle");
  };

  const save = () => {
    const value = Number.parseInt(score, 10);
    if (!Number.isFinite(value) || value < 0) {
      setError("Enter how many clean changes you made.");
      return;
    }
    const savedKey = key;
    startTransition(async () => {
      try {
        await saveDrillResult("chord-change", savedKey, value);
        setPhase("idle");
        setScore("");
        setJustDone((done) => (done.includes(savedKey) ? done : [...done, savedKey]));
        if (runningSet) {
          const next = todays.find((pair) => pair.key !== savedKey && !doneKeys.has(pair.key));
          if (next) select(next);
          else setRunningSet(false);
        }
        router.refresh();
      } catch (err) {
        setError(`Couldn't save: ${err instanceof Error ? err.message : String(err)}`);
      }
    });
  };

  const busy = phase === "countdown" || phase === "running";
  const startLabel =
    runningSet && position >= 0 ? `Start change ${position + 1} of ${todays.length}` : "Start 60-second drill";

  return (
    <div className="grid gap-4 lg:grid-cols-[2fr_1fr]">
      <div className="space-y-4">
        <Card>
          <CardTitle
            action={
              <span className="text-sm text-ink-3 tabular-nums">
                {doneCount} / {todays.length} done
              </span>
            }
          >
            Today&apos;s changes
          </CardTitle>
          <p className="-mt-2 mb-4 text-sm text-ink-3">
            {songTitles.join(" and ")} asks for {ranked.length} different changes — too many to drill in one sitting. These{" "}
            {todays.length} are today&apos;s, picked from what you&apos;ve never tried, scored lowest, or haven&apos;t
            touched in longest. The rest are below.
          </p>

          <ul className="divide-y divide-border">
            {todays.map((pair, index) => {
              const done = doneKeys.has(pair.key);
              const selected = pair.key === key;
              return (
                <li key={pair.key}>
                  <button
                    disabled={busy}
                    onClick={() => select(pair)}
                    className={cn(
                      "flex w-full items-center gap-3 py-3 text-left disabled:opacity-50",
                      selected && "font-medium",
                    )}
                  >
                    <span
                      className={cn(
                        "grid h-6 w-6 shrink-0 place-items-center rounded-md border text-sm",
                        done ? "border-good bg-good text-white" : "border-border text-ink-3",
                      )}
                    >
                      {done ? "✓" : index + 1}
                    </span>
                    <span className={cn("min-w-0 flex-1", done && "text-ink-3 line-through")}>
                      <span className="block">
                        {pair.first} ↔ {pair.second}
                      </span>
                      <span className="text-sm text-ink-3">
                        {pickReason(pair)} · {pair.count}× in the song
                      </span>
                    </span>
                    <Pill tone={TIER_TONES[pair.tier]}>
                      {pair.best === null ? TIER_LABELS[pair.tier] : `best ${pair.best}`}
                    </Pill>
                    {selected && <span className="shrink-0 text-accent">←</span>}
                  </button>
                </li>
              );
            })}
          </ul>

          {phase === "idle" && remaining.length > 0 && !runningSet && (
            <Button className="mt-4 w-full" onClick={startSet}>
              {doneCount > 0 ? `Carry on — ${remaining.length} left` : `Start today's ${todays.length}`}
            </Button>
          )}
          {remaining.length === 0 && (
            <p className="mt-4 rounded-xl bg-surface-2 p-3 text-center text-sm text-ink-2">
              Today&apos;s set is done. Drill anything else you like below — it all still counts.
            </p>
          )}
        </Card>

        <Card className="space-y-6">
          <div className="flex items-center justify-center gap-2 sm:gap-8">
            <ChordDiagram chord={first} size={150} />
            <span className="text-3xl text-ink-3">↔</span>
            <ChordDiagram chord={second} size={150} />
          </div>

          <div className="flex flex-col items-center gap-4 text-center">
            {phase === "idle" && (
              <Button size="lg" onClick={start} disabled={first === second}>
                {startLabel}
              </Button>
            )}
            {phase === "countdown" && (
              <>
                <div className="font-display text-8xl font-semibold text-accent tabular-nums">{countdown}</div>
                <Button variant="ghost" onClick={cancel}>
                  Cancel
                </Button>
              </>
            )}
            {phase === "running" && (
              <>
                <div className={cn("font-display text-8xl font-semibold tabular-nums", secondsLeft <= 10 && "text-rose")}>
                  {secondsLeft}
                </div>
                <p className="text-sm text-ink-3">Change! Keep counting in your head.</p>
                <Button variant="ghost" onClick={cancel}>
                  Cancel
                </Button>
              </>
            )}
            {phase === "entering" && (
              <div className="w-full max-w-xs space-y-3">
                <p className="font-display text-xl font-semibold">Time! How many clean changes?</p>
                <input
                  type="number"
                  inputMode="numeric"
                  min={0}
                  autoFocus
                  value={score}
                  onChange={(event) => setScore(event.target.value)}
                  onKeyDown={(event) => event.key === "Enter" && save()}
                  className="field h-14 text-center text-2xl"
                />
                <div className="flex gap-2">
                  <Button variant="secondary" className="flex-1" onClick={cancel}>
                    Discard
                  </Button>
                  <Button className="flex-1" onClick={save} disabled={pending}>
                    {pending ? "Saving…" : "Save score"}
                  </Button>
                </div>
              </div>
            )}
            {first === second && phase === "idle" && <p className="text-sm text-ink-3">Pick two different chords.</p>}
            {error && <p className="text-sm text-bad">{error}</p>}
          </div>

          <details className="border-t border-border pt-4">
            <summary className="cursor-pointer text-sm font-medium text-ink-2">
              All {ranked.length} changes in {songTitles.join(" and ")}
            </summary>
            <div className="mt-4 space-y-4">
              {TIER_ORDER.map((tier) => {
                const group = ranked.filter((pair) => pair.tier === tier);
                if (group.length === 0) return null;
                return (
                  <div key={tier} className="space-y-2">
                    <span className="label">
                      {TIER_LABELS[tier]} · {group.length}
                    </span>
                    <div className="flex flex-wrap gap-2">
                      {group.map((pair) => (
                        <button
                          key={pair.key}
                          disabled={busy}
                          title={`${pair.count}× in ${pair.sections.join(", ")}`}
                          onClick={() => select(pair)}
                          className={cn(
                            "rounded-full px-3 py-1.5 text-sm font-medium disabled:opacity-50",
                            pair.key === key
                              ? "bg-ink text-bg"
                              : pair.best === null
                                ? "bg-surface-2 text-ink-3 ring-1 ring-inset ring-border hover:text-ink"
                                : "bg-surface-2 text-ink-2 hover:text-ink",
                          )}
                        >
                          {pair.first} ↔ {pair.second}
                          {pair.best !== null && <span className="ml-1.5 opacity-70">{pair.best}</span>}
                        </button>
                      ))}
                    </div>
                  </div>
                );
              })}

              <div className="grid grid-cols-2 gap-3 border-t border-border pt-4">
                {[
                  { value: first, set: setFirst, label: "First chord" },
                  { value: second, set: setSecond, label: "Second chord" },
                ].map((picker) => (
                  <label key={picker.label}>
                    <span className="label">{picker.label}</span>
                    <select
                      value={picker.value}
                      onChange={(event) => picker.set(event.target.value)}
                      disabled={busy}
                      className="field"
                    >
                      {CHORDS.map((chord) => (
                        <option key={chord.name} value={chord.name}>
                          {chord.name}
                        </option>
                      ))}
                    </select>
                  </label>
                ))}
              </div>
            </div>
          </details>
        </Card>
      </div>

      <Card>
        <h2 className="font-display text-lg font-semibold">
          {first} ↔ {second}
        </h2>
        {selectedPair ? (
          <p className="mt-1 text-sm text-ink-3">
            {selectedPair.count}× in {selectedPair.songs.join(", ")} — {selectedPair.sections.join(", ")}
          </p>
        ) : (
          <p className="mt-1 text-sm text-ink-3">Not a change any of your songs asks for — drill it anyway if you like.</p>
        )}
        <div className="mt-4 grid grid-cols-2 gap-3">
          <div className="rounded-xl bg-surface-2 p-3">
            <div className="label">Best</div>
            <div className="font-display text-3xl font-semibold tabular-nums">{best ?? "—"}</div>
          </div>
          <div className="rounded-xl bg-surface-2 p-3">
            <div className="label">Attempts</div>
            <div className="font-display text-3xl font-semibold tabular-nums">{history.length}</div>
          </div>
        </div>

        <h3 className="mb-2 mt-6 text-sm font-medium text-ink-2">Recent attempts</h3>
        {history.length === 0 ? (
          <p className="text-sm text-ink-3">No attempts yet. Aim for 30, then 60 (one per second).</p>
        ) : (
          <ul className="space-y-2">
            {history.slice(0, 10).map((result) => (
              <li key={result.id} className="flex items-center gap-3 text-sm">
                <span className="w-20 shrink-0 text-ink-3">
                  {new Date(result.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                </span>
                <div className="h-2 flex-1 overflow-hidden rounded-full bg-surface-2">
                  <div
                    className={cn("h-full rounded-full", result.score === best ? "bg-good" : "bg-accent")}
                    style={{ width: `${Math.min(100, (result.score / 60) * 100)}%` }}
                  />
                </div>
                <span className="w-8 text-right font-medium tabular-nums">{result.score}</span>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}
