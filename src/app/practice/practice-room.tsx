"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";
import { discardSession, finishSession, startSession } from "@/app/actions/session";
import { FOCUS_AREAS } from "@/content/focus-areas";
import { Recorder } from "@/components/recorder";
import { Button, ButtonLink, Card, CardTitle, cn, PageHeader, ProgressBar } from "@/components/ui";
import {
  EMPTY_DRAFT,
  elapsedMs,
  getPracticeState,
  setPracticeState,
  updateDraft,
  usePracticeState,
} from "@/lib/practice-store";
import { formatClock } from "@/lib/time";
import { useNow } from "@/lib/use-now";

const STALE_SESSION_MS = 3 * 60 * 60 * 1000;

type SongOption = { id: number; title: string; sections: { id: number; name: string }[] };

/** A suggested shape for a 30-minute session, scaled to the daily goal. */
const PLAN = [
  { area: "Tuning", share: 0.05, detail: "Tune up (and retune after the capo)", href: "/tools/tuner" },
  { area: "Warm-up", share: 0.1, detail: "Finger stretches, slow chromatic runs", href: null },
  { area: "Chord changes", share: 0.15, detail: "One-minute changes on your two hardest pairs", href: "/tools/chord-changes" },
  { area: "Picking pattern", share: 0.2, detail: "Travis pattern on one chord, then through changes", href: "/tools/metronome" },
  { area: "Song sections", share: 0.4, detail: "Play-along on the section marked 'learning'", href: "/songs" },
  { area: "Full run-through", share: 0.1, detail: "Play it top to bottom without stopping — record it", href: null },
];

export function PracticeRoom({
  active,
  todayMinutes,
  goalMinutes,
  songs,
}: {
  active: { id: number; startedAt: string } | null;
  todayMinutes: number;
  goalMinutes: number;
  songs: SongOption[];
}) {
  const router = useRouter();
  const state = usePracticeState();
  const now = useNow(250, Boolean(state?.runningSince));
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [finishing, setFinishing] = useState(false);
  const [dismissedId, setDismissedId] = useState<number | null>(null);
  const reconciled = useRef(false);

  // On first load, line the local timer up with what the server knows.
  useEffect(() => {
    if (reconciled.current) return;
    reconciled.current = true;
    const local = getPracticeState();
    if (active && local?.sessionId !== active.id) {
      // Started on another device or before storage was cleared. If it's old, don't count the gap.
      const startedAt = Date.parse(active.startedAt);
      const stale = Date.now() - startedAt > STALE_SESSION_MS;
      setPracticeState({
        sessionId: active.id,
        accumulatedMs: 0,
        runningSince: stale ? null : startedAt,
        draft: { ...EMPTY_DRAFT, songId: songs[0]?.id ?? null },
      });
    } else if (!active && local) {
      setPracticeState(null);
    }
  }, [active, songs]);

  const elapsed = elapsedMs(state, now);
  const sessionMinutes = elapsed / 60000;
  const draft = state?.draft ?? EMPTY_DRAFT;
  const selectedSong = songs.find((song) => song.id === draft.songId) ?? null;

  const begin = () => {
    setError(null);
    startTransition(async () => {
      try {
        const session = await startSession();
        setPracticeState({
          sessionId: session.id,
          accumulatedMs: 0,
          runningSince: Date.now(),
          draft: { ...EMPTY_DRAFT, songId: songs[0]?.id ?? null },
        });
      } catch (err) {
        setError(err instanceof Error ? err.message : String(err));
      }
    });
  };

  const togglePause = () => {
    if (!state) return;
    if (state.runningSince) {
      setPracticeState({ ...state, accumulatedMs: elapsedMs(state, Date.now()), runningSince: null });
    } else {
      setPracticeState({ ...state, runningSince: Date.now() });
    }
  };

  const toggleArea = (area: string) => {
    const has = draft.focusAreas.includes(area);
    updateDraft({ focusAreas: has ? draft.focusAreas.filter((item) => item !== area) : [...draft.focusAreas, area] });
  };

  const toggleSection = (id: number) => {
    const has = draft.sectionIds.includes(id);
    updateDraft({ sectionIds: has ? draft.sectionIds.filter((item) => item !== id) : [...draft.sectionIds, id] });
  };

  const finish = () => {
    if (!state) return;
    setError(null);
    const durationSeconds = elapsedMs(state, Date.now()) / 1000;
    startTransition(async () => {
      try {
        const { id } = await finishSession({ sessionId: state.sessionId, durationSeconds, ...state.draft });
        setPracticeState(null);
        router.push(`/journal/${id}`);
      } catch (err) {
        setError(err instanceof Error ? err.message : String(err));
      }
    });
  };

  const discard = () => {
    if (!state || !confirm("Throw away this session? The time won't be counted.")) return;
    startTransition(async () => {
      try {
        await discardSession(state.sessionId);
        setDismissedId(state.sessionId);
        setPracticeState(null);
        setFinishing(false);
      } catch (err) {
        setError(err instanceof Error ? err.message : String(err));
      }
    });
  };

  // Server says a session is running but the local timer hasn't loaded yet.
  if (!state && active && active.id !== dismissedId) {
    return (
      <div className="space-y-6">
        <PageHeader title="Practice" />
        <Card className="py-16 text-center text-ink-3">Resuming your session…</Card>
      </div>
    );
  }

  if (!state) {
    const remaining = Math.max(0, goalMinutes - todayMinutes);
    return (
      <div className="space-y-6">
        <PageHeader
          title="Practice"
          subtitle={remaining > 0 ? `${Math.ceil(remaining)} minutes left to hit today's ${goalMinutes}.` : "Today's goal is done — bonus time!"}
          action={<ButtonLink href="/journal?log=1" variant="secondary">Log practice manually</ButtonLink>}
        />
        <Card className="flex flex-col items-center gap-6 py-12 text-center">
          <div className="font-display text-7xl font-semibold tabular-nums text-ink-3">0:00</div>
          <Button size="lg" onClick={begin} disabled={pending} className="min-w-56">
            {pending ? "Starting…" : "Start session"}
          </Button>
          <div className="w-full max-w-sm">
            <ProgressBar value={todayMinutes} max={goalMinutes} />
            <p className="mt-2 text-sm text-ink-3">{Math.floor(todayMinutes)} / {goalMinutes} min today</p>
          </div>
          {error && <p className="text-sm text-bad">{error}</p>}
        </Card>
        <SessionPlan goalMinutes={goalMinutes} />
      </div>
    );
  }

  const running = Boolean(state.runningSince);
  const totalToday = todayMinutes + sessionMinutes;

  return (
    <div className="space-y-6">
      <PageHeader title="Practice" subtitle="Your timer keeps running if you switch to the tuner, a lesson or a song." />

      <Card className="flex flex-col items-center gap-5 py-10 text-center">
        <div className={cn("font-display text-7xl font-semibold tabular-nums md:text-8xl", !running && "text-ink-3")}>
          {formatClock(elapsed / 1000)}
        </div>
        <div className="w-full max-w-sm">
          <ProgressBar value={totalToday} max={goalMinutes} tone={totalToday >= goalMinutes ? "good" : "accent"} />
          <p className="mt-2 text-sm text-ink-3">
            {Math.floor(totalToday)} / {goalMinutes} min today
            {totalToday >= goalMinutes && " · goal hit 🎉"}
          </p>
        </div>
        <div className="flex flex-wrap justify-center gap-3">
          <Button size="lg" variant={running ? "secondary" : "primary"} onClick={togglePause}>
            {running ? "Pause" : "Resume"}
          </Button>
          <Button size="lg" variant="rose" onClick={() => setFinishing(true)} disabled={pending}>
            Finish session
          </Button>
        </div>
      </Card>

      {finishing && (
        <Card className="border-rose/40">
          <CardTitle>Wrap up</CardTitle>
          <div className="space-y-4">
            <div>
              <span className="label">How did it feel?</span>
              <div className="flex gap-1">
                {[1, 2, 3, 4, 5].map((value) => (
                  <button
                    key={value}
                    onClick={() => updateDraft({ rating: value })}
                    className={cn("text-3xl transition", (draft.rating ?? 0) >= value ? "text-accent" : "text-ink-3/40")}
                    aria-label={`${value} stars`}
                  >
                    ★
                  </button>
                ))}
              </div>
            </div>
            <label className="block">
              <span className="label">Notes for your journal</span>
              <textarea
                value={draft.notes}
                onChange={(event) => updateDraft({ notes: event.target.value })}
                rows={4}
                placeholder="What clicked? What's still hard? e.g. 'Am → F still buzzes, verse picking finally felt smooth at 70'"
                className="field"
              />
            </label>
            <p className="text-sm text-ink-3">
              {formatClock(elapsed / 1000)} will be added to your total, then your AI coach writes up the session.
            </p>
            <div className="flex flex-wrap gap-2">
              <Button onClick={finish} disabled={pending}>
                {pending ? "Saving…" : "Save session & write journal"}
              </Button>
              <Button variant="ghost" onClick={() => setFinishing(false)} disabled={pending}>
                Keep practicing
              </Button>
              <Button variant="danger" onClick={discard} disabled={pending} className="ml-auto">
                Discard session
              </Button>
            </div>
          </div>
        </Card>
      )}
      {error && <p className="text-sm text-bad">{error}</p>}

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardTitle>What are you working on?</CardTitle>
          <div className="flex flex-wrap gap-2">
            {FOCUS_AREAS.map((area) => (
              <button
                key={area}
                onClick={() => toggleArea(area)}
                className={cn(
                  "rounded-full border px-3 py-1.5 text-sm font-medium transition",
                  draft.focusAreas.includes(area) ? "border-accent bg-accent-soft text-accent" : "border-border text-ink-2 hover:bg-surface-2",
                )}
              >
                {draft.focusAreas.includes(area) ? "✓ " : ""}
                {area}
              </button>
            ))}
          </div>

          {songs.length > 0 && (
            <div className="mt-6 space-y-3">
              <label className="block">
                <span className="label">Song</span>
                <select
                  value={draft.songId ?? ""}
                  onChange={(event) => updateDraft({ songId: event.target.value ? Number(event.target.value) : null, sectionIds: [] })}
                  className="field"
                >
                  <option value="">No song today</option>
                  {songs.map((song) => (
                    <option key={song.id} value={song.id}>{song.title}</option>
                  ))}
                </select>
              </label>
              {selectedSong && selectedSong.sections.length > 0 && (
                <div>
                  <span className="label">Sections</span>
                  <div className="flex flex-wrap gap-2">
                    {selectedSong.sections.map((section) => (
                      <button
                        key={section.id}
                        onClick={() => toggleSection(section.id)}
                        className={cn(
                          "rounded-lg border px-3 py-1 text-sm",
                          draft.sectionIds.includes(section.id) ? "border-rose bg-rose-soft text-rose" : "border-border text-ink-2",
                        )}
                      >
                        {section.name}
                      </button>
                    ))}
                  </div>
                </div>
              )}
              <label className="block max-w-40">
                <span className="label">Tempo reached (BPM)</span>
                <input
                  type="number"
                  min={20}
                  max={300}
                  value={draft.bpm ?? ""}
                  onChange={(event) => updateDraft({ bpm: event.target.value ? Number(event.target.value) : null })}
                  className="field"
                />
              </label>
              {selectedSong && (
                <Link href={`/songs/${selectedSong.id}`} className="inline-block text-sm text-accent hover:underline">
                  Open {selectedSong.title} →
                </Link>
              )}
            </div>
          )}
        </Card>

        <div className="space-y-6">
          <Card>
            <CardTitle>Record</CardTitle>
            <p className="mb-4 text-sm text-ink-2">Audio or video of yourself playing. Once you hit record it lives in the top bar — go to the song, tuner or anywhere else and it keeps recording until you press Stop.</p>
            <Recorder songId={draft.songId} />
          </Card>
          <Card>
            <CardTitle>Quick tools</CardTitle>
            <div className="grid grid-cols-2 gap-2">
              {[
                ["/tools/tuner", "Tuner"],
                ["/tools/metronome", "Metronome"],
                ["/tools/chord-changes", "Chord changes"],
                ["/tools/chords", "Chord library"],
              ].map(([href, label]) => (
                <ButtonLink key={href} href={href} variant="secondary">{label}</ButtonLink>
              ))}
            </div>
          </Card>
        </div>
      </div>

      <SessionPlan goalMinutes={goalMinutes} checked={draft.focusAreas} onToggle={toggleArea} />
    </div>
  );
}

function SessionPlan({
  goalMinutes,
  checked,
  onToggle,
}: {
  goalMinutes: number;
  checked?: string[];
  onToggle?: (area: string) => void;
}) {
  return (
    <Card>
      <CardTitle>A {goalMinutes}-minute session plan</CardTitle>
      <ol className="divide-y divide-border">
        {PLAN.map((step) => {
          const done = checked?.includes(step.area);
          return (
            <li key={step.area} className="flex items-center gap-4 py-3">
              {onToggle ? (
                <button
                  onClick={() => onToggle(step.area)}
                  aria-label={`Mark ${step.area}`}
                  className={cn(
                    "grid h-6 w-6 shrink-0 place-items-center rounded-md border text-sm",
                    done ? "border-good bg-good text-white" : "border-border",
                  )}
                >
                  {done ? "✓" : ""}
                </button>
              ) : null}
              <div className="w-14 shrink-0 font-mono text-sm tabular-nums text-ink-3">
                {Math.max(1, Math.round(goalMinutes * step.share))} min
              </div>
              <div className="min-w-0 flex-1">
                <div className={cn("font-medium", done && "text-ink-3 line-through")}>{step.area}</div>
                <div className="text-sm text-ink-3">{step.detail}</div>
              </div>
              {step.href && (
                <Link href={step.href} className="shrink-0 text-sm text-accent hover:underline">
                  Open
                </Link>
              )}
            </li>
          );
        })}
      </ol>
    </Card>
  );
}
