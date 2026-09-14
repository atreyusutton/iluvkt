export type SheetLine =
  | { type: "heading"; text: string }
  | { type: "note"; text: string }
  | { type: "blank" }
  | { type: "lyric"; segments: { chord: string | null; text: string }[] };

const CHORD_TOKEN = /^[A-G][#b]?(?:maj|min|dim|aug|sus|add|m|M)?\d*(?:(?:sus|add)\d+)?(?:\/[A-G][#b]?)?$/;
const SECTION_HEADING = /^\[([A-Za-z][A-Za-z -]*\d*)\]$/;

function stripParens(token: string) {
  return token.replace(/^\(+/, "").replace(/\)+$/, "");
}

function isChordLine(line: string): boolean {
  const tokens = line.trim().split(/\s+/).filter(Boolean);
  return tokens.length > 0 && tokens.every((token) => CHORD_TOKEN.test(stripParens(token)));
}

function isSectionHeading(line: string): boolean {
  const match = line.trim().match(SECTION_HEADING);
  return Boolean(match && !CHORD_TOKEN.test(match[1]));
}

function isPlainText(line: string | undefined): line is string {
  if (!line?.trim()) return false;
  const trimmed = line.trim();
  return !trimmed.startsWith("#") && !trimmed.startsWith(">") && !isSectionHeading(trimmed) && !isChordLine(trimmed);
}

/** "C    G   Am" over a lyric line → segments with each chord above the text starting at its column. */
function mergeChordsOverLyrics(chordLine: string, lyric: string) {
  const chords = [...chordLine.matchAll(/\S+/g)].map((match) => ({ chord: stripParens(match[0]), column: match.index }));
  const segments: { chord: string | null; text: string }[] = [];
  if (chords[0].column > 0) segments.push({ chord: null, text: lyric.slice(0, chords[0].column) });
  chords.forEach((current, index) => {
    const end = chords[index + 1]?.column ?? lyric.length;
    segments.push({ chord: current.chord, text: lyric.slice(current.column, Math.max(end, current.column)) });
  });
  return segments.filter((segment) => segment.chord || segment.text);
}

function parseInlineChords(line: string) {
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
  return segments.filter((segment) => segment.chord || segment.text);
}

/**
 * Understands two formats, mixed freely:
 *   ChordPro-style — `# Verse` heading, `> note`, `[C]Well [G]hi` inline chords
 *   Tab-site style — `[Verse 1]` heading, a line of chords above a line of lyrics
 */
export function parseChordSheet(source: string): SheetLine[] {
  const lines = source.split(/\r?\n/).map((line) => line.trimEnd());
  const result: SheetLine[] = [];

  for (let index = 0; index < lines.length; index++) {
    const line = lines[index];
    const trimmed = line.trim();

    if (!trimmed) {
      result.push({ type: "blank" });
    } else if (trimmed.startsWith("#")) {
      result.push({ type: "heading", text: trimmed.replace(/^#+\s*/, "") });
    } else if (trimmed.startsWith(">")) {
      result.push({ type: "note", text: trimmed.replace(/^>\s*/, "") });
    } else if (isSectionHeading(trimmed)) {
      result.push({ type: "heading", text: trimmed.slice(1, -1) });
    } else if (isChordLine(trimmed)) {
      const next = lines[index + 1];
      if (isPlainText(next)) {
        result.push({ type: "lyric", segments: mergeChordsOverLyrics(line, next) });
        index++;
      } else {
        result.push({
          type: "lyric",
          segments: trimmed.split(/\s+/).map((token) => ({ chord: stripParens(token), text: "" })),
        });
      }
    } else {
      result.push({ type: "lyric", segments: parseInlineChords(line) });
    }
  }
  return result;
}

export function chordsInSheet(source: string): string[] {
  const found = new Set<string>();
  for (const line of parseChordSheet(source)) {
    if (line.type !== "lyric") continue;
    for (const segment of line.segments) if (segment.chord) found.add(segment.chord);
  }
  return [...found];
}
