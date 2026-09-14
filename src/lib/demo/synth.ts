import "server-only";
import { findChord } from "@/content/chords";
import { TRAVIS_PATTERN } from "@/content/songs";
import type { Bar } from "@/db/schema";

const SAMPLE_RATE = 22_050;
const OPEN_STRING_MIDI = [40, 45, 50, 55, 59, 64]; // string 6 (low E) → string 1 (high E)

/** Deterministic PRNG so the same demo always sounds the same. */
function mulberry32(seed: number) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Karplus–Strong plucked string, mixed into `out` starting at `startSample`. */
function pluck(out: Float32Array, startSample: number, frequency: number, amplitude: number, random: () => number, muted: boolean) {
  const period = Math.max(2, Math.round(SAMPLE_RATE / frequency));
  const ring = new Float32Array(period);
  for (let i = 0; i < period; i++) ring[i] = (random() * 2 - 1) * amplitude;
  const length = Math.min(out.length - startSample, Math.round(SAMPLE_RATE * (muted ? 0.12 : 2.2)));
  const decay = muted ? 0.9 : 0.9965;
  let previous = 0;
  for (let n = 0; n < length; n++) {
    const index = n % period;
    const current = ring[index];
    out[startSample + n] += current;
    ring[index] = decay * 0.5 * (current + previous);
    previous = current;
  }
}

/**
 * Renders fingerpicked Travis-pattern audio for a progression.
 * `sloppiness` 0 → tight and clean, 1 → beginner: late changes, dropped and buzzy notes.
 */
export function renderPractice({
  bars,
  bpm,
  capo,
  sloppiness,
  seed,
}: {
  bars: Bar[];
  bpm: number;
  capo: number;
  sloppiness: number;
  seed: number;
}): Buffer {
  const random = mulberry32(seed);
  const stepSeconds = 60 / bpm / 2;
  const estimate = bars.reduce((sum, bar) => sum + bar.beats, 0) * 2 * stepSeconds * (1 + sloppiness * 0.3) + 3;
  const out = new Float32Array(Math.ceil(estimate * SAMPLE_RATE));

  let time = 0.4;
  for (const bar of bars) {
    const shape = findChord(bar.chord);
    // Beginners hesitate at chord changes.
    time += random() < sloppiness * 0.6 ? stepSeconds * (0.5 + random() * sloppiness * 1.5) : 0;
    const steps = bar.beats * 2;
    for (let step = 0; step < steps; step++) {
      const pattern = TRAVIS_PATTERN.steps[step % TRAVIS_PATTERN.steps.length];
      const strings = [...pattern.treble];
      if (shape && pattern.bass) strings.push(pattern.bass === "root" ? shape.root : shape.alt);
      for (const stringNumber of strings) {
        const fret = shape ? shape.frets[6 - stringNumber] : 0;
        if (fret < 0) continue;
        if (random() < sloppiness * 0.12) continue; // missed note
        const midi = OPEN_STRING_MIDI[6 - stringNumber] + fret + capo;
        const frequency = 440 * 2 ** ((midi - 69) / 12);
        const jitter = (random() * 2 - 1) * sloppiness * 0.05;
        const start = Math.max(0, Math.round((time + jitter) * SAMPLE_RATE));
        const isBass = stringNumber >= 4;
        const muted = random() < sloppiness * 0.1;
        pluck(out, start, frequency, (isBass ? 0.32 : 0.24) * (0.8 + random() * 0.3), random, muted);
      }
      time += stepSeconds;
    }
  }

  const endSample = Math.min(out.length, Math.round((time + 2) * SAMPLE_RATE));
  let peak = 0;
  for (let i = 0; i < endSample; i++) peak = Math.max(peak, Math.abs(out[i]));
  const gain = peak > 0 ? 0.85 / peak : 1;

  const header = Buffer.alloc(44);
  const dataBytes = endSample * 2;
  header.write("RIFF", 0);
  header.writeUInt32LE(36 + dataBytes, 4);
  header.write("WAVE", 8);
  header.write("fmt ", 12);
  header.writeUInt32LE(16, 16);
  header.writeUInt16LE(1, 20); // PCM
  header.writeUInt16LE(1, 22); // mono
  header.writeUInt32LE(SAMPLE_RATE, 24);
  header.writeUInt32LE(SAMPLE_RATE * 2, 28);
  header.writeUInt16LE(2, 32);
  header.writeUInt16LE(16, 34);
  header.write("data", 36);
  header.writeUInt32LE(dataBytes, 40);

  const data = Buffer.alloc(dataBytes);
  for (let i = 0; i < endSample; i++) {
    const sample = Math.max(-1, Math.min(1, out[i] * gain));
    data.writeInt16LE(Math.round(sample * 32767), i * 2);
  }
  return Buffer.concat([header, data]);
}

export function wavDurationSeconds(wav: Buffer): number {
  return (wav.length - 44) / (SAMPLE_RATE * 2);
}
