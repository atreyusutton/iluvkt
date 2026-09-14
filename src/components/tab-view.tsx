import { findChord, patternToTab, STRING_NAMES } from "@/content/chords";
import type { PickStep } from "@/db/schema";
import { cn } from "./ui";

function fingerFor(step: PickStep): string {
  const parts: string[] = [];
  if (step.bass) parts.push("T");
  for (const string of step.treble) parts.push(string === 3 ? "I" : string === 2 ? "M" : "R");
  return parts.join("");
}

/** Renders one bar of a picking pattern as guitar tab for a given chord, optionally highlighting a step. */
export function TabView({
  chordName,
  steps,
  beatsPerBar = 4,
  activeStep = null,
}: {
  chordName: string;
  steps: PickStep[];
  beatsPerBar?: number;
  activeStep?: number | null;
}) {
  const chord = findChord(chordName);
  if (!chord) return <p className="text-sm text-ink-3">No shape for {chordName} in the chord library.</p>;
  const rows = patternToTab(chord, steps);
  const perBeat = Math.max(1, Math.round(steps.length / beatsPerBar));

  return (
    <div className="overflow-x-auto">
      <table className="border-separate border-spacing-0 font-mono text-sm">
        <tbody>
          <tr className="text-xs text-ink-3">
            <td className="pr-2" />
            {steps.map((_, index) => (
              <td key={index} className="w-8 pb-1 text-center">
                {index % perBeat === 0 ? index / perBeat + 1 : "&"}
              </td>
            ))}
          </tr>
          {rows.map((row, stringIndex) => (
            <tr key={stringIndex}>
              <td className="pr-2 text-ink-3">{STRING_NAMES[stringIndex]}</td>
              {row.map((cell, column) => (
                <td
                  key={column}
                  className={cn(
                    "relative h-6 w-8 text-center",
                    activeStep === column && "bg-accent-soft",
                  )}
                >
                  <span className="absolute inset-x-0 top-1/2 border-t border-ink-3/40" />
                  {cell !== "-" && (
                    <span className="relative z-10 rounded bg-surface px-1 font-semibold text-ink">{cell}</span>
                  )}
                </td>
              ))}
            </tr>
          ))}
          <tr className="text-xs font-medium text-accent">
            <td className="pr-2" />
            {steps.map((step, index) => (
              <td key={index} className={cn("pt-1 text-center", activeStep === index && "bg-accent-soft")}>
                {fingerFor(step)}
              </td>
            ))}
          </tr>
        </tbody>
      </table>
    </div>
  );
}
