"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";
import { saveDrillResult } from "@/app/actions/misc";
import { Fretboard } from "@/components/fretboard";
import { Button, Card, cn } from "@/components/ui";

const NOTES = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];
// MIDI numbers of the open strings, indexed by string number (1 = high e).
const OPEN_MIDI: Record<number, number> = { 1: 64, 2: 59, 3: 55, 4: 50, 5: 45, 6: 40 };
const ROUND_SECONDS = 60;

type StringMode = "all" | "low";
type FretMode = 5 | 12;
type Position = { string: number; fret: number };

const noteAt = ({ string, fret }: Position) => NOTES[(OPEN_MIDI[string] + fret) % 12];
const modeKey = (strings: StringMode, frets: FretMode) => `${strings}-${frets}`;
const modeLabel = (strings: StringMode, frets: FretMode) =>
  `${strings === "all" ? "All strings" : "Low E + A"}, frets 0–${frets}`;

function randomPosition(strings: StringMode, frets: FretMode, previous: Position | null): Position {
  const pool = strings === "all" ? [1, 2, 3, 4, 5, 6] : [5, 6];
  for (;;) {
    const next = { string: pool[Math.floor(Math.random() * pool.length)], fret: Math.floor(Math.random() * (frets + 1)) };
    if (!previous || next.string !== previous.string || next.fret !== previous.fret) return next;
  }
}

export function FretboardTrainer({ bestByMode }: { bestByMode: Record<string, number> }) {
  const router = useRouter();
  const [strings, setStrings] = useState<StringMode>("low");
  const [frets, setFrets] = useState<FretMode>(5);
  const [phase, setPhase] = useState<"idle" | "running" | "done">("idle");
  const [position, setPosition] = useState<Position | null>(null);
  const [score, setScore] = useState(0);
  const [attempts, setAttempts] = useState(0);
  const [secondsLeft, setSecondsLeft] = useState(ROUND_SECONDS);
  const [feedback, setFeedback] = useState<{ correct: boolean; text: string } | null>(null);
  const [saveState, setSaveState] = useState<{ status: "idle" | "saved" | "error"; message?: string }>({ status: "idle" });
  const [pending, startTransition] = useTransition();
  const timerRef = useRef<number | null>(null);
  const scoreRef = useRef(0);

  const key = modeKey(strings, frets);
  const best = bestByMode[key];

  const clearTimer = () => {
    if (timerRef.current !== null) window.clearInterval(timerRef.current);
    timerRef.current = null;
  };
  useEffect(() => clearTimer, []);

  const finish = (finalScore: number, finishedKey: string) => {
    clearTimer();
    setPhase("done");
    setPosition(null);
    if (finalScore === 0) return;
    startTransition(async () => {
      try {
        await saveDrillResult("fretboard", finishedKey, finalScore);
        setSaveState({ status: "saved" });
        router.refresh();
      } catch (err) {
        setSaveState({ status: "error", message: err instanceof Error ? err.message : String(err) });
      }
    });
  };

  const start = () => {
    clearTimer();
    scoreRef.current = 0;
    setScore(0);
    setAttempts(0);
    setFeedback(null);
    setSaveState({ status: "idle" });
    setPosition(randomPosition(strings, frets, null));
    setPhase("running");
    setSecondsLeft(ROUND_SECONDS);
    const endAt = Date.now() + ROUND_SECONDS * 1000;
    const roundKey = key;
    timerRef.current = window.setInterval(() => {
      const left = Math.max(0, Math.ceil((endAt - Date.now()) / 1000));
      setSecondsLeft(left);
      if (left === 0) finish(scoreRef.current, roundKey);
    }, 200);
  };

  const answer = (note: string) => {
    if (phase !== "running" || !position) return;
    const correctNote = noteAt(position);
    const correct = note === correctNote;
    if (correct) {
      scoreRef.current += 1;
      setScore(scoreRef.current);
    }
    setAttempts((value) => value + 1);
    setFeedback({ correct, text: correct ? `✓ ${correctNote}` : `✗ That was ${correctNote}` });
    setPosition(randomPosition(strings, frets, position));
  };

  const accuracy = attempts ? Math.round((score / attempts) * 100) : 0;

  return (
    <div className="space-y-4">
      <Card className="space-y-5">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div className="flex flex-wrap gap-4">
            <div>
              <span className="label">Strings</span>
              <div className="flex gap-2">
                {(["low", "all"] as const).map((value) => (
                  <button
                    key={value}
                    disabled={phase === "running"}
                    onClick={() => setStrings(value)}
                    className={cn(
                      "h-9 rounded-lg px-3 text-sm font-medium disabled:opacity-50",
                      strings === value ? "bg-ink text-bg" : "bg-surface-2 text-ink-2",
                    )}
                  >
                    {value === "low" ? "Low E + A" : "All"}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <span className="label">Frets</span>
              <div className="flex gap-2">
                {([5, 12] as const).map((value) => (
                  <button
                    key={value}
                    disabled={phase === "running"}
                    onClick={() => setFrets(value)}
                    className={cn(
                      "h-9 rounded-lg px-3 text-sm font-medium disabled:opacity-50",
                      frets === value ? "bg-ink text-bg" : "bg-surface-2 text-ink-2",
                    )}
                  >
                    0–{value}
                  </button>
                ))}
              </div>
            </div>
          </div>
          <div className="flex gap-6 text-right">
            <div>
              <div className="label">Time</div>
              <div className={cn("font-display text-3xl font-semibold tabular-nums", phase === "running" && secondsLeft <= 10 && "text-rose")}>
                {secondsLeft}
              </div>
            </div>
            <div>
              <div className="label">Score</div>
              <div className="font-display text-3xl font-semibold tabular-nums">{score}</div>
            </div>
            <div>
              <div className="label">Best</div>
              <div className="font-display text-3xl font-semibold tabular-nums text-ink-3">{best ?? "—"}</div>
            </div>
          </div>
        </div>

        <Fretboard
          frets={frets}
          highlight={position}
          highlightTone="accent"
          activeStrings={strings === "all" ? [1, 2, 3, 4, 5, 6] : [5, 6]}
        />

        <div className="h-6 text-center text-sm font-medium">
          {feedback && phase === "running" && (
            <span key={attempts} className={feedback.correct ? "text-good" : "text-bad"}>
              {feedback.text}
            </span>
          )}
        </div>

        {phase === "running" ? (
          <div className="grid grid-cols-4 gap-2 sm:grid-cols-6 lg:grid-cols-12">
            {NOTES.map((note) => (
              <button
                key={note}
                onClick={() => answer(note)}
                className={cn(
                  "h-12 rounded-xl text-base font-semibold transition active:scale-95",
                  note.includes("#") ? "bg-ink text-bg" : "border border-border bg-surface text-ink hover:bg-surface-2",
                )}
              >
                {note}
              </button>
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center gap-3 text-center">
            {phase === "done" && (
              <div>
                <p className="font-display text-2xl font-semibold">
                  {score} correct <span className="text-ink-3">· {accuracy}% accuracy</span>
                </p>
                <p className="text-sm text-ink-3">
                  {modeLabel(strings, frets)}
                  {best !== undefined && score > 0 && score >= best && saveState.status === "saved" ? " · New best! 🎉" : ""}
                  {pending ? " · saving…" : saveState.status === "saved" ? " · saved" : ""}
                </p>
                {saveState.status === "error" && <p className="text-sm text-bad">Couldn&apos;t save: {saveState.message}</p>}
              </div>
            )}
            <Button size="lg" onClick={start}>
              {phase === "done" ? "Play again" : "Start 60-second round"}
            </Button>
            <p className="max-w-md text-sm text-ink-3">
              Tip: learn the low E and A strings first — they&apos;re where the root notes of most chords live.
            </p>
          </div>
        )}
      </Card>

      <Card>
        <h2 className="mb-3 font-display text-lg font-semibold">Best by mode</h2>
        <div className="grid gap-3 sm:grid-cols-4">
          {(["low", "all"] as const).flatMap((s) =>
            ([5, 12] as const).map((f) => (
              <div key={modeKey(s, f)} className="rounded-xl bg-surface-2 p-3">
                <div className="text-xs text-ink-3">{modeLabel(s, f)}</div>
                <div className="font-display text-2xl font-semibold tabular-nums">{bestByMode[modeKey(s, f)] ?? "—"}</div>
              </div>
            )),
          )}
        </div>
      </Card>
    </div>
  );
}
