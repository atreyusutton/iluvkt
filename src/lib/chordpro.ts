export type SheetLine =
  | { type: "heading"; text: string }
  | { type: "note"; text: string }
  | { type: "blank" }
  | { type: "lyric"; segments: { chord: string | null; text: string }[] };

/**
 * Minimal ChordPro-style parser:
 *   # Verse        → heading
 *   > some note    → note
 *   [C]Well [G]hi  → chords placed above the syllable that follows them
 */
export function parseChordSheet(source: string): SheetLine[] {
  return source.split(/\r?\n/).map((raw): SheetLine => {
    const line = raw.trimEnd();
    if (!line.trim()) return { type: "blank" };
    if (line.startsWith("#")) return { type: "heading", text: line.replace(/^#+\s*/, "") };
    if (line.startsWith(">")) return { type: "note", text: line.replace(/^>\s*/, "") };

    const segments: { chord: string | null; text: string }[] = [];
    const pattern = /\[([^\]]+)\]/g;
    let lastIndex = 0;
    let pendingChord: string | null = null;
    for (let match = pattern.exec(line); match; match = pattern.exec(line)) {
      const text = line.slice(lastIndex, match.index);
      if (text || pendingChord) segments.push({ chord: pendingChord, text });
      pendingChord = match[1].trim();
      lastIndex = match.index + match[0].length;
    }
    segments.push({ chord: pendingChord, text: line.slice(lastIndex) });
    return { type: "lyric", segments: segments.filter((segment) => segment.chord || segment.text) };
  });
}

export function chordsInSheet(source: string): string[] {
  const found = new Set<string>();
  for (const line of parseChordSheet(source)) {
    if (line.type !== "lyric") continue;
    for (const segment of line.segments) if (segment.chord) found.add(segment.chord);
  }
  return [...found];
}
