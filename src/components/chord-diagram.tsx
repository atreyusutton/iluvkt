import { findChord, type ChordShape } from "@/content/chords";

/** SVG chord box. Pass a shape or a chord name; unknown names render a labelled placeholder. */
export function ChordDiagram({
  chord,
  size = 120,
  highlightStrings = [],
  showName = true,
}: {
  chord: ChordShape | string;
  size?: number;
  highlightStrings?: number[];
  showName?: boolean;
}) {
  const shape = typeof chord === "string" ? findChord(chord) : chord;
  const name = typeof chord === "string" ? chord : chord.name;
  const width = size;
  const height = size * 1.25;

  if (!shape) {
    return (
      <div className="grid place-items-center rounded-xl border border-dashed border-border text-sm text-ink-3" style={{ width, height }}>
        {name}?
      </div>
    );
  }

  const fretted = shape.frets.filter((fret) => fret > 0);
  const maxFret = Math.max(...fretted, 0);
  const baseFret = maxFret > 4 ? Math.min(...fretted) : 1;
  const frets = 4;
  const padX = width * 0.17;
  const top = height * (showName ? 0.24 : 0.12);
  const bottom = height * 0.93;
  const gridW = width - padX * 2;
  const stringGap = gridW / 5;
  const fretGap = (bottom - top) / frets;
  const x = (stringIndex: number) => padX + stringIndex * stringGap; // 0 = low E
  const y = (fret: number) => top + (fret - baseFret + 0.5) * fretGap;
  const dot = Math.min(stringGap, fretGap) * 0.36;

  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} role="img" aria-label={`${name} chord diagram`}>
      {showName && (
        <text x={width / 2} y={height * 0.1} textAnchor="middle" fontSize={size * 0.15} fontWeight={600} fill="var(--ink)" className="font-display">
          {name}
        </text>
      )}
      {Array.from({ length: frets + 1 }, (_, i) => (
        <line
          key={`f${i}`}
          x1={padX}
          x2={width - padX}
          y1={top + i * fretGap}
          y2={top + i * fretGap}
          stroke="var(--ink-3)"
          strokeWidth={i === 0 && baseFret === 1 ? 3.5 : 1}
        />
      ))}
      {Array.from({ length: 6 }, (_, i) => (
        <line
          key={`s${i}`}
          x1={x(i)}
          x2={x(i)}
          y1={top}
          y2={bottom}
          stroke={highlightStrings.includes(6 - i) ? "var(--rose)" : "var(--ink-3)"}
          strokeWidth={highlightStrings.includes(6 - i) ? 2.5 : 1}
        />
      ))}
      {baseFret > 1 && (
        <text x={padX * 0.35} y={y(baseFret) + 4} fontSize={size * 0.1} fill="var(--ink-2)">
          {baseFret}fr
        </text>
      )}
      {shape.barre && (
        <rect
          x={x(6 - shape.barre.fromString) - dot}
          y={y(shape.barre.fret) - dot}
          width={x(6 - shape.barre.toString) - x(6 - shape.barre.fromString) + dot * 2}
          height={dot * 2}
          rx={dot}
          fill="var(--ink)"
        />
      )}
      {shape.frets.map((fret, i) => {
        if (fret === -1 || fret === 0) {
          return (
            <text key={`m${i}`} x={x(i)} y={top - size * 0.04} textAnchor="middle" fontSize={size * 0.1} fill="var(--ink-2)">
              {fret === -1 ? "×" : "○"}
            </text>
          );
        }
        return (
          <g key={`d${i}`}>
            <circle cx={x(i)} cy={y(fret)} r={dot} fill={highlightStrings.includes(6 - i) ? "var(--rose)" : "var(--ink)"} />
            {shape.fingers[i] > 0 && (
              <text x={x(i)} y={y(fret) + dot * 0.38} textAnchor="middle" fontSize={dot * 1.05} fontWeight={600} fill="var(--bg)">
                {shape.fingers[i]}
              </text>
            )}
          </g>
        );
      })}
    </svg>
  );
}
