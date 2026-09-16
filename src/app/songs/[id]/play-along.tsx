"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { recordSectionTempo } from "@/app/actions/songs";
import { ChordDiagram } from "@/components/chord-diagram";
import { TabView } from "@/components/tab-view";
import { Button, Card, cn } from "@/components/ui";
import { findChord } from "@/content/chords";
import type { PickingPattern, SongSection } from "@/db/schema";
import { Metronome } from "@/lib/audio/metronome";
import { getPracticeState, updateDraft } from "@/lib/practice-store";

type TimelineBar = { key: string; sectionId: number; sectionName: string; chord: string; beats: number; startBeat: number };

type Position = { countIn: number | null; beat: number; tick: number };

/** Tempo-driven play-along: highlights chords and picking steps in time with a click. Not tied to any video. */
export function PlayAlong({
  songId,
  sections,
  beatsPerBar,
  targetBpm,
  pattern,
}: {
  songId: number;
  sections: SongSection[];
  beatsPerBar: number;
  targetBpm: number;
  pattern: PickingPattern | null;
}) {
  const playable = sections.filter((section) => section.bars.length > 0);
  const [selected, setSelected] = useState<number[]>(() => playable.slice(0, 1).map((section) => section.id));
  const [bpm, setBpm] = useState(() => Math.min(60, targetBpm));
  const [countIn, setCountIn] = useState(true);
  const [click, setClick] = useState(true);
  const [loop, setLoop] = useState(true);
  const [playing, setPlaying] = useState(false);
  const [position, setPosition] = useState<Position | null>(null);
  const [lastPlayedBpm, setLastPlayedBpm] = useState<number | null>(null);
  const [saved, setSaved] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const metronomeRef = useRef<Metronome | null>(null);
  const barRefs = useRef(new Map<string, HTMLDivElement>());

  const timeline = useMemo(() => {
    const bars: TimelineBar[] = [];
    let beat = 0;
    for (const section of playable) {
      if (!selected.includes(section.id)) continue;
      section.bars.forEach((bar, index) => {
        bars.push({ key: `${section.id}-${index}`, sectionId: section.id, sectionName: section.name, chord: bar.chord, beats: bar.beats, startBeat: beat });
        beat += bar.beats;
      });
    }
    return { bars, totalBeats: beat };
  }, [playable, selected]);

  const stepsPerBeat = pattern ? Math.max(1, Math.round(pattern.steps.length / beatsPerBar)) : 2;

  const stop = () => {
    metronomeRef.current?.stop();
    setPlaying(false);
    setPosition(null);
  };

  useEffect(() => () => metronomeRef.current?.dispose(), []);

  // Live-adjust tempo and click while playing.
  useEffect(() => {
    if (metronomeRef.current) {
      metronomeRef.current.bpm = bpm;
      metronomeRef.current.muted = !click;
    }
  }, [bpm, click]);

  const play = async () => {
    if (timeline.totalBeats === 0) return;
    setSaved(null);
    const metronome = (metronomeRef.current ??= new Metronome());
    // The site-wide metronome widget can take the click over; keep the transport in sync.
    metronome.onStopped = () => {
      setPlaying(false);
      setPosition(null);
    };
    metronome.bpm = bpm;
    metronome.beatsPerBar = beatsPerBar;
    metronome.subdivisions = stepsPerBeat;
    metronome.muted = !click;
    const countInBeats = countIn ? beatsPerBar : 0;
    let tick = 0;
    metronome.onTick = () => {
      const currentTick = tick++;
      const rawBeat = Math.floor(currentTick / stepsPerBeat);
      if (rawBeat < countInBeats) {
        setPosition({ countIn: countInBeats - rawBeat, beat: -1, tick: currentTick % stepsPerBeat });
        return;
      }
      let beat = rawBeat - countInBeats;
      if (beat >= timeline.totalBeats) {
        if (!loop) {
          stop();
          return;
        }
        beat %= timeline.totalBeats;
      }
      setPosition({ countIn: null, beat, tick: currentTick % stepsPerBeat });
    };
    try {
      await metronome.start();
      setPlaying(true);
      setLastPlayedBpm(bpm);
      if (getPracticeState()) {
        updateDraft({ songId, sectionIds: selected, bpm });
      }
    } catch (error) {
      console.error("Couldn't start audio", error);
      setSaved(`Couldn't start audio: ${error instanceof Error ? error.message : String(error)}`);
    }
  };

  const currentIndex =
    position && position.beat >= 0
      ? timeline.bars.findIndex((bar) => position.beat >= bar.startBeat && position.beat < bar.startBeat + bar.beats)
      : -1;
  const current = currentIndex >= 0 ? timeline.bars[currentIndex] : timeline.bars[0];
  const next = timeline.bars[(Math.max(currentIndex, 0) + 1) % Math.max(1, timeline.bars.length)];
  const beatInBar = current && position && position.beat >= 0 ? position.beat - current.startBeat : -1;
  const activeStep = pattern && beatInBar >= 0 ? (beatInBar * stepsPerBeat + (position?.tick ?? 0)) % pattern.steps.length : null;
  const currentStep = pattern && activeStep !== null ? pattern.steps[activeStep] : null;
  const currentShape = current ? findChord(current.chord) : undefined;
  const highlight =
    currentShape && currentStep
      ? [...currentStep.treble, ...(currentStep.bass ? [currentStep.bass === "root" ? currentShape.root : currentShape.alt] : [])]
      : [];

  useEffect(() => {
    if (!current || !playing) return;
    barRefs.current.get(current.key)?.scrollIntoView({ block: "nearest", inline: "nearest", behavior: "smooth" });
  }, [current, playing]);

  if (playable.length === 0) {
    return <p className="text-ink-2">Add chords to a section (Sections tab) to use the play-along.</p>;
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap gap-2">
        {playable.map((section) => (
          <button
            key={section.id}
            disabled={playing}
            onClick={() =>
              setSelected((current) =>
                current.includes(section.id) ? current.filter((id) => id !== section.id) : [...current, section.id],
              )
            }
            className={cn(
              "rounded-lg border px-3 py-1.5 text-sm font-medium disabled:opacity-60",
              selected.includes(section.id) ? "border-accent bg-accent-soft text-accent" : "border-border text-ink-2",
            )}
          >
            {section.name}
            <span className="ml-1 text-xs text-ink-3">{section.bars.length} bars</span>
          </button>
        ))}
      </div>

      <div className="grid gap-5 lg:grid-cols-[auto_1fr]">
        <Card className="flex items-center justify-center gap-6 bg-surface-2">
          <div className="text-center">
            <div className="text-xs uppercase tracking-wide text-ink-3">Now</div>
            {position?.countIn ? (
              <div className="grid h-[200px] w-[160px] place-items-center font-display text-8xl font-semibold text-accent">{position.countIn}</div>
            ) : current ? (
              <ChordDiagram chord={current.chord} size={160} highlightStrings={highlight} />
            ) : null}
          </div>
          <div className="text-center opacity-70">
            <div className="text-xs uppercase tracking-wide text-ink-3">Next</div>
            {next && <ChordDiagram chord={next.chord} size={90} />}
          </div>
        </Card>

        <div className="space-y-4">
          <div className="flex flex-wrap items-center gap-3">
            <Button size="lg" onClick={playing ? stop : play} disabled={timeline.totalBeats === 0} className="min-w-32">
              {playing ? "■ Stop" : "▶ Play"}
            </Button>
            <div className="flex items-center gap-1">
              <Button variant="secondary" size="sm" onClick={() => setBpm((value) => Math.max(30, value - 4))}>−4</Button>
              <div className="w-24 text-center">
                <div className="font-display text-3xl font-semibold tabular-nums">{bpm}</div>
                <div className="text-xs text-ink-3">BPM · target {targetBpm}</div>
              </div>
              <Button variant="secondary" size="sm" onClick={() => setBpm((value) => Math.min(240, value + 4))}>+4</Button>
            </div>
          </div>
          <input type="range" min={30} max={Math.max(targetBpm + 20, 120)} value={bpm} onChange={(event) => setBpm(Number(event.target.value))} className="w-full" />
          <div className="flex flex-wrap gap-4 text-sm text-ink-2">
            <label className="flex items-center gap-2"><input type="checkbox" checked={click} onChange={(e) => setClick(e.target.checked)} /> Click</label>
            <label className="flex items-center gap-2"><input type="checkbox" checked={countIn} onChange={(e) => setCountIn(e.target.checked)} disabled={playing} /> Count-in</label>
            <label className="flex items-center gap-2"><input type="checkbox" checked={loop} onChange={(e) => setLoop(e.target.checked)} /> Loop</label>
          </div>
          <div className="flex gap-2">
            {Array.from({ length: current?.beats ?? beatsPerBar }, (_, index) => (
              <span
                key={index}
                className={cn(
                  "h-3 flex-1 rounded-full transition-colors duration-75",
                  beatInBar === index ? (index === 0 ? "bg-rose" : "bg-accent") : "bg-surface-2",
                )}
              />
            ))}
          </div>
          {lastPlayedBpm && !playing && (
            <div className="flex flex-wrap items-center gap-3 rounded-xl bg-good-soft px-3 py-2 text-sm text-good">
              Played clean at {lastPlayedBpm} BPM?
              <Button
                size="sm"
                variant="secondary"
                disabled={pending}
                onClick={() =>
                  startTransition(async () => {
                    await recordSectionTempo(selected, lastPlayedBpm);
                    setSaved(`Saved ${lastPlayedBpm} BPM as your best for these sections.`);
                    setLastPlayedBpm(null);
                  })
                }
              >
                Save as best tempo
              </Button>
            </div>
          )}
          {saved && <p className="text-sm text-ink-2">{saved}</p>}
        </div>
      </div>

      <div className="flex gap-2 overflow-x-auto pb-2">
        {timeline.bars.map((bar, index) => {
          const firstOfSection = index === 0 || timeline.bars[index - 1].sectionId !== bar.sectionId;
          return (
            <div
              key={bar.key}
              ref={(element) => {
                if (element) barRefs.current.set(bar.key, element);
                else barRefs.current.delete(bar.key);
              }}
              className="shrink-0"
            >
              <div className="h-4 text-[10px] uppercase tracking-wide text-ink-3">{firstOfSection ? bar.sectionName : ""}</div>
              <div
                className={cn(
                  "grid h-14 w-16 place-items-center rounded-xl border font-display text-lg font-semibold transition-colors",
                  index === currentIndex ? "border-accent bg-accent text-accent-ink" : "border-border bg-surface",
                )}
              >
                {bar.chord}
              </div>
            </div>
          );
        })}
      </div>

      {pattern && current && (
        <Card>
          <div className="mb-3 text-sm font-medium">{pattern.name} on {current.chord}</div>
          <TabView chordName={current.chord} steps={pattern.steps} beatsPerBar={beatsPerBar} activeStep={activeStep} />
        </Card>
      )}
    </div>
  );
}
