"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";
import { saveDrillResult } from "@/app/actions/misc";
import { ChordDiagram } from "@/components/chord-diagram";
import { Button, Card, cn } from "@/components/ui";
import { CHORDS } from "@/content/chords";
import { beep } from "@/lib/audio/metronome";

type Result = { id: number; key: string; score: number; createdAt: string };
type Phase = "idle" | "countdown" | "running" | "entering";

const SUGGESTED: [string, string][] = [
  ["C", "G"],
  ["G", "Am"],
  ["Am", "F"],
  ["C", "F"],
  ["D7", "G"],
  ["G", "G7"],
  ["C", "C7"],
  ["F", "D7"],
];

const DRILL_SECONDS = 60;
const pairKey = (a: string, b: string) => `${a}→${b}`;

export function ChordChangeDrill({ results }: { results: Result[] }) {
  const router = useRouter();
  const [first, setFirst] = useState("C");
  const [second, setSecond] = useState("G");
  const [phase, setPhase] = useState<Phase>("idle");
  const [countdown, setCountdown] = useState(3);
  const [secondsLeft, setSecondsLeft] = useState(DRILL_SECONDS);
  const [score, setScore] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const timerRef = useRef<number | null>(null);

  const key = pairKey(first, second);
  const history = results.filter((result) => result.key === key);
  const best = history.reduce<number | null>((max, result) => (max === null || result.score > max ? result.score : max), null);
  const bestByPair = new Map<string, number>();
  for (const result of results) bestByPair.set(result.key, Math.max(bestByPair.get(result.key) ?? 0, result.score));

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
    startTransition(async () => {
      try {
        await saveDrillResult("chord-change", key, value);
        setPhase("idle");
        setScore("");
        router.refresh();
      } catch (err) {
        setError(`Couldn't save: ${err instanceof Error ? err.message : String(err)}`);
      }
    });
  };

  const busy = phase === "countdown" || phase === "running";

  return (
    <div className="grid gap-4 lg:grid-cols-[2fr_1fr]">
      <Card className="space-y-6">
        <div className="flex flex-wrap gap-2">
          {SUGGESTED.map(([a, b]) => {
            const selected = a === first && b === second;
            const pairBest = bestByPair.get(pairKey(a, b));
            return (
              <button
                key={pairKey(a, b)}
                disabled={busy}
                onClick={() => {
                  setFirst(a);
                  setSecond(b);
                }}
                className={cn(
                  "rounded-full px-3 py-1.5 text-sm font-medium disabled:opacity-50",
                  selected ? "bg-ink text-bg" : "bg-surface-2 text-ink-2 hover:text-ink",
                )}
              >
                {a} ↔ {b}
                {pairBest !== undefined && <span className="ml-1.5 opacity-70">{pairBest}</span>}
              </button>
            );
          })}
        </div>

        <div className="grid grid-cols-2 gap-3">
          {[
            { value: first, set: setFirst, label: "First chord" },
            { value: second, set: setSecond, label: "Second chord" },
          ].map((picker) => (
            <label key={picker.label}>
              <span className="label">{picker.label}</span>
              <select value={picker.value} onChange={(event) => picker.set(event.target.value)} disabled={busy} className="field">
                {CHORDS.map((chord) => (
                  <option key={chord.name} value={chord.name}>
                    {chord.name}
                  </option>
                ))}
              </select>
            </label>
          ))}
        </div>

        <div className="flex items-center justify-center gap-2 sm:gap-8">
          <ChordDiagram chord={first} size={150} />
          <span className="text-3xl text-ink-3">↔</span>
          <ChordDiagram chord={second} size={150} />
        </div>

        <div className="flex flex-col items-center gap-4 text-center">
          {phase === "idle" && (
            <Button size="lg" onClick={start} disabled={first === second}>
              Start 60-second drill
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
      </Card>

      <Card>
        <h2 className="font-display text-lg font-semibold">
          {first} ↔ {second}
        </h2>
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
