"use client";

import { useEffect, useRef, useState } from "react";
import { Button, Card, cn } from "@/components/ui";

const NOTE_NAMES = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];
const STRINGS = [
  { label: "E2", midi: 40 },
  { label: "A2", midi: 45 },
  { label: "D3", midi: 50 },
  { label: "G3", midi: 55 },
  { label: "B3", midi: 59 },
  { label: "E4", midi: 64 },
];

const midiToFrequency = (midi: number) => 440 * 2 ** ((midi - 69) / 12);

/** ACF2+ autocorrelation pitch detection. Returns -1 when the signal is too quiet or unclear. */
function detectPitch(buffer: Float32Array, sampleRate: number): number {
  let rms = 0;
  for (const sample of buffer) rms += sample * sample;
  rms = Math.sqrt(rms / buffer.length);
  if (rms < 0.01) return -1;

  // Trim leading/trailing low-amplitude parts.
  const threshold = 0.2;
  let start = 0;
  let end = buffer.length - 1;
  for (let i = 0; i < buffer.length / 2; i++) {
    if (Math.abs(buffer[i]) < threshold) {
      start = i;
      break;
    }
  }
  for (let i = 1; i < buffer.length / 2; i++) {
    if (Math.abs(buffer[buffer.length - i]) < threshold) {
      end = buffer.length - i;
      break;
    }
  }
  const trimmed = buffer.slice(start, end);
  const size = trimmed.length;
  const correlation = new Float32Array(size);
  for (let lag = 0; lag < size; lag++) {
    let sum = 0;
    for (let i = 0; i < size - lag; i++) sum += trimmed[i] * trimmed[i + lag];
    correlation[lag] = sum;
  }

  let dip = 0;
  while (dip < size - 1 && correlation[dip] > correlation[dip + 1]) dip++;
  let bestValue = -1;
  let bestLag = -1;
  for (let lag = dip; lag < size; lag++) {
    if (correlation[lag] > bestValue) {
      bestValue = correlation[lag];
      bestLag = lag;
    }
  }
  if (bestLag <= 0 || bestLag >= size - 1) return -1;

  // Parabolic interpolation around the peak for sub-sample accuracy.
  const x1 = correlation[bestLag - 1];
  const x2 = correlation[bestLag];
  const x3 = correlation[bestLag + 1];
  const a = (x1 + x3 - 2 * x2) / 2;
  const b = (x3 - x1) / 2;
  const lag = a ? bestLag - b / (2 * a) : bestLag;
  return sampleRate / lag;
}

type Reading = { frequency: number; note: string; octave: number; cents: number; midi: number };

export function Tuner() {
  const [listening, setListening] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [reading, setReading] = useState<Reading | null>(null);
  const cleanupRef = useRef<(() => void) | null>(null);

  useEffect(() => () => cleanupRef.current?.(), []);

  const start = async () => {
    setError(null);
    let stream: MediaStream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: false },
      });
    } catch (err) {
      if (err instanceof DOMException && (err.name === "NotAllowedError" || err.name === "SecurityError")) {
        setError("Microphone access was blocked. Allow the mic for this site in your browser settings, then try again.");
      } else if (err instanceof DOMException && err.name === "NotFoundError") {
        setError("No microphone found. Plug one in or check your system sound settings.");
      } else {
        setError(`Couldn't start the microphone: ${err instanceof Error ? err.message : String(err)}`);
      }
      return;
    }

    const context = new AudioContext();
    const source = context.createMediaStreamSource(stream);
    const analyser = context.createAnalyser();
    analyser.fftSize = 4096;
    source.connect(analyser);
    const buffer = new Float32Array(analyser.fftSize);
    let frame = 0;
    let smoothed: number | null = null;

    const tick = () => {
      analyser.getFloatTimeDomainData(buffer);
      const frequency = detectPitch(buffer, context.sampleRate);
      if (frequency > 60 && frequency < 1400) {
        smoothed = smoothed && Math.abs(frequency - smoothed) / smoothed < 0.06 ? smoothed * 0.7 + frequency * 0.3 : frequency;
        const midiExact = 69 + 12 * Math.log2(smoothed / 440);
        const midi = Math.round(midiExact);
        setReading({
          frequency: smoothed,
          midi,
          note: NOTE_NAMES[((midi % 12) + 12) % 12],
          octave: Math.floor(midi / 12) - 1,
          cents: Math.round((midiExact - midi) * 100),
        });
      }
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);

    cleanupRef.current = () => {
      cancelAnimationFrame(frame);
      stream.getTracks().forEach((track) => track.stop());
      context.close().catch((closeError: unknown) => console.warn("Closing AudioContext failed", closeError));
      cleanupRef.current = null;
    };
    setListening(true);
  };

  const stop = () => {
    cleanupRef.current?.();
    setListening(false);
    setReading(null);
  };

  const nearestString = reading
    ? STRINGS.reduce((best, string) =>
        Math.abs(string.midi - 12 * Math.log2(reading.frequency / 440) - 69) <
        Math.abs(best.midi - 12 * Math.log2(reading.frequency / 440) - 69)
          ? string
          : best,
      )
    : null;
  const inTune = reading ? Math.abs(reading.cents) <= 5 : false;
  const needleAngle = reading ? Math.max(-50, Math.min(50, reading.cents)) * 0.9 : 0;

  return (
    <div className="grid gap-4 lg:grid-cols-[2fr_1fr]">
      <Card className="flex flex-col items-center gap-6 py-10 text-center">
        <div className="flex items-baseline gap-1">
          <span className={cn("font-display text-8xl font-semibold tabular-nums", inTune ? "text-good" : "text-ink")}>
            {reading?.note ?? "–"}
          </span>
          <span className="text-2xl text-ink-3">{reading?.octave ?? ""}</span>
        </div>

        <svg viewBox="0 0 240 130" className="w-full max-w-sm" aria-label={reading ? `${reading.cents} cents` : "No pitch"}>
          <path d="M 20 120 A 100 100 0 0 1 220 120" fill="none" stroke="var(--surface-2)" strokeWidth={14} strokeLinecap="round" />
          <path
            d="M 20 120 A 100 100 0 0 1 220 120"
            fill="none"
            stroke="var(--good-soft)"
            strokeWidth={14}
            strokeDasharray={`${Math.PI * 100 * 0.05} ${Math.PI * 100}`}
            strokeDashoffset={-Math.PI * 100 * 0.475}
          />
          {[-50, -25, 0, 25, 50].map((cents) => {
            const angle = ((cents * 0.9 - 90) * Math.PI) / 180;
            return (
              <line
                key={cents}
                x1={120 + Math.cos(angle) * 84}
                y1={120 + Math.sin(angle) * 84}
                x2={120 + Math.cos(angle) * 72}
                y2={120 + Math.sin(angle) * 72}
                stroke="var(--ink-3)"
                strokeWidth={cents === 0 ? 2.5 : 1.5}
              />
            );
          })}
          <g style={{ transform: `rotate(${needleAngle}deg)`, transformOrigin: "120px 120px", transition: "transform 120ms linear" }}>
            <line x1={120} y1={120} x2={120} y2={30} stroke={inTune ? "var(--good)" : reading ? "var(--accent)" : "var(--ink-3)"} strokeWidth={4} strokeLinecap="round" />
          </g>
          <circle cx={120} cy={120} r={7} fill="var(--ink)" />
          <text x={20} y={112} fontSize={10} fill="var(--ink-3)" textAnchor="middle">♭</text>
          <text x={220} y={112} fontSize={10} fill="var(--ink-3)" textAnchor="middle">♯</text>
        </svg>

        <div className="text-sm text-ink-2">
          {reading ? (
            <>
              <span className="tabular-nums">{reading.frequency.toFixed(1)} Hz</span> ·{" "}
              <span className={cn("font-medium tabular-nums", inTune ? "text-good" : "text-accent")}>
                {reading.cents > 0 ? "+" : ""}
                {reading.cents} cents
              </span>{" "}
              {inTune ? "— in tune ✓" : reading.cents < 0 ? "— tune up" : "— tune down"}
            </>
          ) : listening ? (
            "Listening… pluck a string"
          ) : (
            "Start the tuner and allow microphone access."
          )}
        </div>

        {listening ? (
          <Button variant="secondary" size="lg" onClick={stop}>
            Stop tuner
          </Button>
        ) : (
          <Button size="lg" onClick={start}>
            Start tuner
          </Button>
        )}
        {error && <p className="max-w-md text-sm text-bad">{error}</p>}
      </Card>

      <Card>
        <h2 className="mb-4 font-display text-lg font-semibold">Standard tuning</h2>
        <ul className="space-y-2">
          {STRINGS.map((string, index) => {
            const active = nearestString?.label === string.label;
            return (
              <li
                key={string.label}
                className={cn(
                  "flex items-center justify-between rounded-xl px-4 py-3 transition",
                  active ? (inTune && reading?.midi === string.midi ? "bg-good-soft text-good" : "bg-accent-soft text-accent") : "bg-surface-2",
                )}
              >
                <span className="font-display text-xl font-semibold">{string.label}</span>
                <span className="text-sm text-ink-3">
                  String {6 - index} · {midiToFrequency(string.midi).toFixed(1)} Hz
                </span>
              </li>
            );
          })}
        </ul>
        <p className="mt-4 text-sm text-ink-3">Tip: tune up to the note. If you&apos;re sharp, drop below and come back up — it holds better.</p>
      </Card>
    </div>
  );
}
