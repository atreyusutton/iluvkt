"use client";

export type BeatEvent = { beat: number; bar: number; subdivision: number; time: number };

/**
 * Only one metronome may click at a time. The site-wide widget, the full tool and a song's
 * play-along each own an instance, so without this two of them can end up clicking at
 * different tempos over each other. Each running instance parks a stop callback here and
 * clears out whoever was clicking before it.
 */
const running = new Map<symbol, () => void>();

/**
 * Sample-accurate metronome: schedules clicks slightly ahead on the Web Audio clock
 * (a setTimeout loop only decides *when to schedule*, never when sound plays).
 */
export class Metronome {
  bpm = 80;
  beatsPerBar = 4;
  /** Ticks per beat delivered to onTick (2 = eighth notes). Clicks still sound only on beats. */
  subdivisions = 1;
  accentFirstBeat = true;
  muted = false;
  volume = 0.8;
  onTick?: (event: BeatEvent) => void;
  /** Fired when something else took over and stopped this one, so its owner can update its UI. */
  onStopped?: () => void;

  private readonly id = Symbol("metronome");
  private context: AudioContext | null = null;
  private timer: number | null = null;
  private nextTickTime = 0;
  private tickIndex = 0;
  private readonly lookaheadMs = 25;
  private readonly scheduleAheadSec = 0.12;

  get running() {
    return this.timer !== null;
  }

  async start() {
    if (this.running) return;
    // Snapshot first: each stop() mutates the map as it unregisters itself.
    for (const [id, stopOther] of [...running]) if (id !== this.id) stopOther();
    running.set(this.id, () => this.stop());
    this.context ??= new AudioContext();
    if (this.context.state === "suspended") await this.context.resume();
    this.tickIndex = 0;
    this.nextTickTime = this.context.currentTime + 0.08;
    this.timer = window.setInterval(() => this.schedule(), this.lookaheadMs);
    this.schedule();
  }

  stop() {
    const wasRunning = this.timer !== null;
    if (this.timer !== null) window.clearInterval(this.timer);
    this.timer = null;
    running.delete(this.id);
    if (wasRunning) this.onStopped?.();
  }

  dispose() {
    this.stop();
    this.context?.close().catch((error: unknown) => console.warn("Closing AudioContext failed", error));
    this.context = null;
  }

  private schedule() {
    const context = this.context;
    if (!context) return;
    while (this.nextTickTime < context.currentTime + this.scheduleAheadSec) {
      const ticksPerBar = this.beatsPerBar * this.subdivisions;
      const tickInBar = this.tickIndex % ticksPerBar;
      const beat = Math.floor(tickInBar / this.subdivisions);
      const subdivision = tickInBar % this.subdivisions;
      const event: BeatEvent = {
        beat,
        bar: Math.floor(this.tickIndex / ticksPerBar),
        subdivision,
        time: this.nextTickTime,
      };

      if (subdivision === 0 && !this.muted) {
        this.click(this.nextTickTime, beat === 0 && this.accentFirstBeat);
      }
      if (this.onTick) {
        const delayMs = Math.max(0, (this.nextTickTime - context.currentTime) * 1000);
        const handler = this.onTick;
        window.setTimeout(() => handler(event), delayMs);
      }

      this.nextTickTime += 60 / this.bpm / this.subdivisions;
      this.tickIndex++;
    }
  }

  private click(time: number, accent: boolean) {
    const context = this.context!;
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    oscillator.frequency.value = accent ? 1760 : 1100;
    gain.gain.setValueAtTime(0.0001, time);
    gain.gain.exponentialRampToValueAtTime(this.volume * (accent ? 1 : 0.6), time + 0.002);
    gain.gain.exponentialRampToValueAtTime(0.0001, time + 0.05);
    oscillator.connect(gain).connect(context.destination);
    oscillator.start(time);
    oscillator.stop(time + 0.06);
  }
}

export const MIN_BPM = 30;
export const MAX_BPM = 240;
export const clampBpm = (value: number) => Math.min(MAX_BPM, Math.max(MIN_BPM, Math.round(value)));

export function tempoName(bpm: number) {
  if (bpm < 60) return "Largo";
  if (bpm < 76) return "Adagio";
  if (bpm < 108) return "Andante";
  if (bpm < 120) return "Moderato";
  if (bpm < 168) return "Allegro";
  return "Presto";
}

/**
 * Average the gaps between recent taps into a tempo. Taps more than 2.5s apart start a new
 * count, and only the last six are kept so speeding up mid-tap settles quickly.
 */
export function tapTempo(previous: number[], now = performance.now()) {
  const taps = [...previous.filter((time) => now - time < 2500), now].slice(-6);
  if (taps.length < 2) return { taps, bpm: null };
  const intervals = taps.slice(1).map((time, index) => time - taps[index]);
  const average = intervals.reduce((sum, value) => sum + value, 0) / intervals.length;
  return { taps, bpm: clampBpm(60000 / average) };
}

/** Short beep for drill start/end cues. */
export function beep(frequency = 880, durationSec = 0.15) {
  const context = new AudioContext();
  const oscillator = context.createOscillator();
  const gain = context.createGain();
  oscillator.frequency.value = frequency;
  gain.gain.setValueAtTime(0.0001, context.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.5, context.currentTime + 0.01);
  gain.gain.exponentialRampToValueAtTime(0.0001, context.currentTime + durationSec);
  oscillator.connect(gain).connect(context.destination);
  oscillator.start();
  oscillator.stop(context.currentTime + durationSec + 0.02);
  oscillator.onended = () => {
    context.close().catch((error: unknown) => console.warn("Closing AudioContext failed", error));
  };
}
