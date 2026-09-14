"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Button, Card, cn } from "@/components/ui";
import { Metronome } from "@/lib/audio/metronome";

const MIN_BPM = 30;
const MAX_BPM = 240;
const clampBpm = (value: number) => Math.min(MAX_BPM, Math.max(MIN_BPM, Math.round(value)));

function tempoName(bpm: number) {
  if (bpm < 60) return "Largo";
  if (bpm < 76) return "Adagio";
  if (bpm < 108) return "Andante";
  if (bpm < 120) return "Moderato";
  if (bpm < 168) return "Allegro";
  return "Presto";
}

export function MetronomeTool() {
  const metronomeRef = useRef<Metronome | null>(null);
  const tapsRef = useRef<number[]>([]);
  const [bpm, setBpm] = useState(80);
  const [beatsPerBar, setBeatsPerBar] = useState(4);
  const [accent, setAccent] = useState(true);
  const [running, setRunning] = useState(false);
  const [currentBeat, setCurrentBeat] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  const getMetronome = () => {
    if (!metronomeRef.current) {
      const metronome = new Metronome();
      metronome.onTick = (event) => setCurrentBeat(event.beat);
      metronomeRef.current = metronome;
    }
    return metronomeRef.current;
  };

  useEffect(() => () => metronomeRef.current?.dispose(), []);

  useEffect(() => {
    const metronome = metronomeRef.current;
    if (!metronome) return;
    metronome.bpm = bpm;
    metronome.beatsPerBar = beatsPerBar;
    metronome.accentFirstBeat = accent;
  }, [bpm, beatsPerBar, accent]);

  const toggle = useCallback(async () => {
    const metronome = getMetronome();
    if (metronome.running) {
      metronome.stop();
      setRunning(false);
      setCurrentBeat(null);
      return;
    }
    metronome.bpm = bpm;
    metronome.beatsPerBar = beatsPerBar;
    metronome.accentFirstBeat = accent;
    try {
      await metronome.start();
      setError(null);
      setRunning(true);
    } catch (err) {
      setError(`Couldn't start audio: ${err instanceof Error ? err.message : String(err)}`);
    }
  }, [bpm, beatsPerBar, accent]);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      if (event.code !== "Space" || target?.closest("input, textarea, select, button")) return;
      event.preventDefault();
      void toggle();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [toggle]);

  const tap = () => {
    const now = performance.now();
    const taps = [...tapsRef.current.filter((time) => now - time < 2500), now].slice(-6);
    tapsRef.current = taps;
    if (taps.length < 2) return;
    const intervals = taps.slice(1).map((time, index) => time - taps[index]);
    const average = intervals.reduce((sum, value) => sum + value, 0) / intervals.length;
    setBpm(clampBpm(60000 / average));
  };

  return (
    <div className="grid gap-4 lg:grid-cols-[2fr_1fr]">
      <Card className="flex flex-col items-center gap-6 py-10 text-center">
        <div className="flex gap-3">
          {Array.from({ length: beatsPerBar }, (_, beat) => (
            <span
              key={beat}
              className={cn(
                "h-5 w-5 rounded-full transition-transform duration-75",
                currentBeat === beat
                  ? beat === 0 && accent
                    ? "scale-125 bg-rose"
                    : "scale-125 bg-accent"
                  : "bg-surface-2",
              )}
            />
          ))}
        </div>

        <div>
          <div className="font-display text-8xl font-semibold tabular-nums">{bpm}</div>
          <div className="text-sm text-ink-3">BPM · {tempoName(bpm)}</div>
        </div>

        <div className="flex w-full max-w-md items-center gap-3">
          <Button variant="secondary" onClick={() => setBpm((value) => clampBpm(value - 1))} aria-label="Slower">
            −
          </Button>
          <input
            type="range"
            min={MIN_BPM}
            max={MAX_BPM}
            value={bpm}
            onChange={(event) => setBpm(Number(event.target.value))}
            className="flex-1"
            aria-label="Tempo"
          />
          <Button variant="secondary" onClick={() => setBpm((value) => clampBpm(value + 1))} aria-label="Faster">
            +
          </Button>
        </div>

        <div className="flex flex-wrap justify-center gap-3">
          <Button size="lg" onClick={() => void toggle()} className="min-w-32">
            {running ? "Stop" : "Start"}
          </Button>
          <Button size="lg" variant="secondary" onClick={tap}>
            Tap tempo
          </Button>
        </div>
        {error && <p className="text-sm text-bad">{error}</p>}
      </Card>

      <Card className="space-y-6">
        <div>
          <span className="label">Beats per bar</span>
          <div className="flex gap-2">
            {[2, 3, 4, 6].map((value) => (
              <button
                key={value}
                onClick={() => setBeatsPerBar(value)}
                className={cn(
                  "h-10 flex-1 rounded-xl text-sm font-medium",
                  beatsPerBar === value ? "bg-accent text-accent-ink" : "bg-surface-2 text-ink-2",
                )}
              >
                {value}
              </button>
            ))}
          </div>
        </div>

        <label className="flex items-center justify-between gap-3 text-sm">
          <span>Accent the first beat</span>
          <input type="checkbox" checked={accent} onChange={(event) => setAccent(event.target.checked)} className="h-5 w-5 accent-[var(--accent)]" />
        </label>

        <div>
          <span className="label">Quick tempos</span>
          <div className="grid grid-cols-3 gap-2">
            {[60, 72, 80, 92, 104, 120].map((value) => (
              <button
                key={value}
                onClick={() => setBpm(value)}
                className={cn("h-9 rounded-lg text-sm", bpm === value ? "bg-ink text-bg" : "bg-surface-2 text-ink-2")}
              >
                {value}
              </button>
            ))}
          </div>
        </div>

        <p className="text-sm text-ink-3">
          Start slow. Once something is clean three times in a row, bump it up 4–5 BPM.
        </p>
      </Card>
    </div>
  );
}
