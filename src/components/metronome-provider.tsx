"use client";

import { usePathname } from "next/navigation";
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { MAX_BPM, MIN_BPM, Metronome, tapTempo, tempoName } from "@/lib/audio/metronome";
import { setMetronomeSettings, useMetronomeSettings } from "@/lib/metronome-store";
import { Button, cn } from "./ui";

type MetronomeContextValue = {
  bpm: number;
  beatsPerBar: number;
  accent: boolean;
  running: boolean;
  setBpm: (value: number | ((current: number) => number)) => void;
  setBeatsPerBar: (value: number) => void;
  setAccent: (value: boolean) => void;
  toggle: () => Promise<void>;
  stop: () => void;
};

const MetronomeContext = createContext<MetronomeContextValue | null>(null);

export function useMetronome() {
  const value = useContext(MetronomeContext);
  if (!value) throw new Error("useMetronome must be used inside <MetronomeProvider>");
  return value;
}

/**
 * Owns the site-wide metronome. Because it lives in the root layout the click keeps going
 * while you navigate — hop from a song to a lesson and the tempo comes with you.
 */
export function MetronomeProvider({ children }: { children: ReactNode }) {
  const metronomeRef = useRef<Metronome | null>(null);
  const tapsRef = useRef<number[]>([]);
  const { bpm, beatsPerBar, accent } = useMetronomeSettings();
  const [running, setRunning] = useState(false);
  const [currentBeat, setCurrentBeat] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  const getMetronome = useCallback(() => {
    if (!metronomeRef.current) {
      const metronome = new Metronome();
      metronome.onTick = (event) => setCurrentBeat(event.beat);
      // A play-along on a song page takes over the click; reflect that here.
      metronome.onStopped = () => {
        setRunning(false);
        setCurrentBeat(null);
      };
      metronomeRef.current = metronome;
    }
    return metronomeRef.current;
  }, []);

  useEffect(() => () => metronomeRef.current?.dispose(), []);

  useEffect(() => {
    const metronome = metronomeRef.current;
    if (!metronome) return;
    metronome.bpm = bpm;
    metronome.beatsPerBar = beatsPerBar;
    metronome.accentFirstBeat = accent;
  }, [bpm, beatsPerBar, accent]);

  const setBpm = useCallback(
    (value: number | ((current: number) => number)) => {
      setMetronomeSettings({ bpm: typeof value === "function" ? value(bpm) : value });
    },
    [bpm],
  );
  const setBeatsPerBar = useCallback((value: number) => setMetronomeSettings({ beatsPerBar: value }), []);
  const setAccent = useCallback((value: boolean) => setMetronomeSettings({ accent: value }), []);

  const stop = useCallback(() => {
    metronomeRef.current?.stop();
    setRunning(false);
    setCurrentBeat(null);
  }, []);

  const toggle = useCallback(async () => {
    const metronome = getMetronome();
    if (metronome.running) {
      stop();
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
  }, [accent, beatsPerBar, bpm, getMetronome, stop]);

  const tap = useCallback(() => {
    const { taps, bpm: tapped } = tapTempo(tapsRef.current);
    tapsRef.current = taps;
    if (tapped !== null) setBpm(tapped);
  }, [setBpm]);

  const value = useMemo<MetronomeContextValue>(
    () => ({ bpm, beatsPerBar, accent, running, setBpm, setBeatsPerBar, setAccent, toggle, stop }),
    [bpm, beatsPerBar, accent, running, setBpm, setBeatsPerBar, setAccent, toggle, stop],
  );

  return (
    <MetronomeContext.Provider value={value}>
      {children}
      <MetronomeWidget
        bpm={bpm}
        beatsPerBar={beatsPerBar}
        accent={accent}
        running={running}
        currentBeat={currentBeat}
        error={error}
        onBpm={setBpm}
        onBeatsPerBar={setBeatsPerBar}
        onAccent={setAccent}
        onToggle={toggle}
        onTap={tap}
      />
    </MetronomeContext.Provider>
  );
}

function MetronomeWidget({
  bpm,
  beatsPerBar,
  accent,
  running,
  currentBeat,
  error,
  onBpm,
  onBeatsPerBar,
  onAccent,
  onToggle,
  onTap,
}: {
  bpm: number;
  beatsPerBar: number;
  accent: boolean;
  running: boolean;
  currentBeat: number | null;
  error: string | null;
  onBpm: (value: number | ((current: number) => number)) => void;
  onBeatsPerBar: (value: number) => void;
  onAccent: (value: boolean) => void;
  onToggle: () => Promise<void>;
  onTap: () => void;
}) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  // The full tool is right there on its own page, so the widget would just be a second set of controls.
  if (pathname === "/tools/metronome") return null;

  return (
    <div className="fixed bottom-20 right-4 z-40 flex flex-col items-end gap-2 md:bottom-6 md:right-6">
      {open && (
        <div className="w-72 rounded-2xl border border-border bg-surface p-4 shadow-xl">
          <div className="mb-3 flex items-baseline justify-between">
            <span className="font-display text-3xl font-semibold tabular-nums">{bpm}</span>
            <span className="text-sm text-ink-3">BPM · {tempoName(bpm)}</span>
          </div>

          <div className="mb-4 flex items-center gap-2">
            <Button variant="secondary" size="sm" onClick={() => onBpm((value) => value - 1)} aria-label="Slower">
              −
            </Button>
            <input
              type="range"
              min={MIN_BPM}
              max={MAX_BPM}
              value={bpm}
              onChange={(event) => onBpm(Number(event.target.value))}
              className="flex-1"
              aria-label="Tempo"
            />
            <Button variant="secondary" size="sm" onClick={() => onBpm((value) => value + 1)} aria-label="Faster">
              +
            </Button>
          </div>

          <span className="label">Beats per bar</span>
          <div className="mb-4 flex gap-1.5">
            {[2, 3, 4, 6, 8].map((value) => (
              <button
                key={value}
                onClick={() => onBeatsPerBar(value)}
                className={cn(
                  "h-9 flex-1 rounded-lg text-sm font-medium",
                  beatsPerBar === value ? "bg-accent text-accent-ink" : "bg-surface-2 text-ink-2",
                )}
              >
                {value}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2">
            <Button variant="secondary" size="sm" onClick={onTap} className="flex-1">
              Tap tempo
            </Button>
            <label className="flex items-center gap-2 text-sm text-ink-2">
              <input
                type="checkbox"
                checked={accent}
                onChange={(event) => onAccent(event.target.checked)}
                className="h-4 w-4 accent-[var(--accent)]"
              />
              Accent
            </label>
          </div>
          {error && <p className="mt-2 text-sm text-bad">{error}</p>}
        </div>
      )}

      <div className="flex items-center gap-2 rounded-full bg-ink py-2 pl-4 pr-2 text-bg shadow-lg">
        <button onClick={() => void onToggle()} className="flex items-center gap-2" aria-label={running ? "Stop metronome" : "Start metronome"}>
          <span className="text-sm font-medium tabular-nums">♩ {bpm}</span>
          <span className="grid h-7 w-7 place-items-center rounded-full bg-bg/15 text-xs">
            {running ? <span className="h-2.5 w-2.5 rounded-sm bg-bg" /> : <span className="ml-0.5 border-y-[6px] border-l-[9px] border-y-transparent border-l-bg" />}
          </span>
        </button>
        <div className="flex items-center gap-1" aria-hidden>
          {Array.from({ length: beatsPerBar }, (_, beat) => (
            <span
              key={beat}
              className={cn(
                "h-1.5 w-1.5 rounded-full transition-transform duration-75",
                running && currentBeat === beat ? (beat === 0 && accent ? "scale-150 bg-rose" : "scale-150 bg-accent") : "bg-bg/30",
              )}
            />
          ))}
        </div>
        <button
          onClick={() => setOpen((value) => !value)}
          className="grid h-7 w-7 place-items-center rounded-full text-xs hover:bg-bg/15"
          aria-label={open ? "Hide metronome settings" : "Show metronome settings"}
          aria-expanded={open}
        >
          {open ? "▼" : "▲"}
        </button>
      </div>
    </div>
  );
}
