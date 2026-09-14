const INLAYS = [3, 5, 7, 9];
const STRING_LABELS = ["e", "B", "G", "D", "A", "E"];

/** Horizontal fretboard (high e on top) with an optional highlighted position. */
export function Fretboard({
  frets = 12,
  highlight,
  highlightTone = "accent",
  activeStrings = [1, 2, 3, 4, 5, 6],
}: {
  frets?: number;
  highlight?: { string: number; fret: number } | null;
  highlightTone?: "accent" | "good" | "bad";
  activeStrings?: number[];
}) {
  const width = 720;
  const height = 190;
  const left = 44;
  const right = 12;
  const top = 18;
  const bottom = 34;
  const nutWidth = 34;
  const fretWidth = (width - left - right - nutWidth) / frets;
  const stringGap = (height - top - bottom) / 5;
  const fretX = (fret: number) => left + nutWidth + fret * fretWidth;
  const noteX = (fret: number) => (fret === 0 ? left + nutWidth / 2 : fretX(fret) - fretWidth / 2);
  const stringY = (string: number) => top + (string - 1) * stringGap;
  const midY = top + 2.5 * stringGap;
  const tone = { accent: "var(--accent)", good: "var(--good)", bad: "var(--bad)" }[highlightTone];

  return (
    <div className="overflow-x-auto">
      <svg viewBox={`0 0 ${width} ${height}`} className="w-full min-w-[520px]" role="img" aria-label="Fretboard">
        <rect x={left + nutWidth} y={top - 6} width={frets * fretWidth} height={stringGap * 5 + 12} rx={4} fill="var(--surface-2)" />
        {INLAYS.filter((fret) => fret <= frets).map((fret) => (
          <circle key={fret} cx={fretX(fret) - fretWidth / 2} cy={midY} r={6} fill="var(--border)" />
        ))}
        {frets >= 12 && (
          <>
            <circle cx={fretX(12) - fretWidth / 2} cy={top + 1.5 * stringGap} r={6} fill="var(--border)" />
            <circle cx={fretX(12) - fretWidth / 2} cy={top + 3.5 * stringGap} r={6} fill="var(--border)" />
          </>
        )}
        <line x1={fretX(0)} x2={fretX(0)} y1={top - 6} y2={top + stringGap * 5 + 6} stroke="var(--ink)" strokeWidth={5} />
        {Array.from({ length: frets }, (_, index) => (
          <line
            key={index}
            x1={fretX(index + 1)}
            x2={fretX(index + 1)}
            y1={top - 6}
            y2={top + stringGap * 5 + 6}
            stroke="var(--ink-3)"
            strokeWidth={1.5}
          />
        ))}
        {STRING_LABELS.map((label, index) => {
          const string = index + 1;
          const active = activeStrings.includes(string);
          return (
            <g key={label + index} opacity={active ? 1 : 0.35}>
              <text x={14} y={stringY(string) + 4} fontSize={12} fill="var(--ink-2)">
                {label}
              </text>
              <line
                x1={left}
                x2={width - right}
                y1={stringY(string)}
                y2={stringY(string)}
                stroke="var(--ink-2)"
                strokeWidth={0.8 + index * 0.35}
              />
            </g>
          );
        })}
        {Array.from({ length: frets + 1 }, (_, fret) => (
          <text key={fret} x={noteX(fret)} y={height - 10} fontSize={11} textAnchor="middle" fill="var(--ink-3)">
            {fret}
          </text>
        ))}
        {highlight && (
          <circle
            cx={noteX(highlight.fret)}
            cy={stringY(highlight.string)}
            r={11}
            fill={tone}
            stroke="var(--surface)"
            strokeWidth={3}
          />
        )}
      </svg>
    </div>
  );
}
