export type SheetLine =
  | { type: "heading"; text: string }
  | { type: "note"; text: string }
  | { type: "blank" }
  /** A line of chords only, kept exactly as written (spacing and parentheses included). */
  | { type: "chords"; row: string }
  /** Monospace rows: chords positioned by column above the lyric text. */
  | { type: "lyric"; chordRow: string | null; textRow: string };

const CHORD_TOKEN = /^[A-G][#b]?(?:maj|min|dim|aug|sus|add|m|M)?\d*(?:(?:sus|add)\d+)?(?:\/[A-G][#b]?)?$/;
/** Print-view artifacts from tab sites, e.g. "Page 1/3". */
const PAGE_MARKER = /^\s*page\s+\d+\s*\/\s*\d+\s*$/i;
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

/** `[C]Well [G]hi` → a chord row padded so each chord sits above the text that follows it. */
function inlineToRows(line: string): { chordRow: string | null; textRow: string } {
  let chordRow = "";
  let textRow = "";
  const pattern = /\[([^\]]+)\]/g;
  let lastIndex = 0;
  for (let match = pattern.exec(line); match; match = pattern.exec(line)) {
    textRow += line.slice(lastIndex, match.index);
    // Keep chords from colliding when two land close together.
    if (chordRow.length > textRow.length) textRow = textRow.padEnd(chordRow.length);
    chordRow = `${chordRow.padEnd(textRow.length)}${match[1].trim()} `;
    lastIndex = match.index + match[0].length;
  }
  textRow += line.slice(lastIndex);
  return { chordRow: chordRow ? chordRow.trimEnd() : null, textRow };
}

/**
 * Understands two formats, mixed freely:
 *   ChordPro-style — `# Verse` heading, `> note`, `[C]Well [G]hi` inline chords
 *   Tab-site style — `[Verse 1]` heading, a line of chords above a line of lyrics
 * Tab-style lines are kept character-for-character so they render exactly as pasted.
 */
export function parseChordSheet(source: string): SheetLine[] {
  const lines = source.replace(/\u00a0/g, " ").split(/\r?\n/).map((line) => line.trimEnd());
  const result: SheetLine[] = [];

  for (let index = 0; index < lines.length; index++) {
    const line = lines[index];
    const trimmed = line.trim();

    if (PAGE_MARKER.test(trimmed)) {
      continue;
    } else if (!trimmed) {
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
        result.push({ type: "lyric", chordRow: line, textRow: next });
        index++;
      } else {
        result.push({ type: "chords", row: line });
      }
    } else {
      result.push({ type: "lyric", ...inlineToRows(line) });
    }
  }
  return result;
}

export function chordsInSheet(source: string): string[] {
  const found = new Set<string>();
  for (const line of parseChordSheet(source)) {
    const row = line.type === "chords" ? line.row : line.type === "lyric" ? line.chordRow : null;
    if (!row) continue;
    for (const token of row.trim().split(/\s+/)) {
      const chord = stripParens(token);
      if (CHORD_TOKEN.test(chord)) found.add(chord);
    }
  }
  return [...found];
}

const TRAILING_JUNK = /^\s*(x|please rate this tab.*|rate this tab.*)\s*$/i;

/**
 * Tidies a chord tab copied from a tab website: drops the page chrome above the first
 * [Intro]-style heading (keeping a "Capo" line just above it) and the rating prompt at the bottom.
 */
export function cleanPastedTab(text: string): string {
  const lines = text.replace(/\u00a0/g, " ").split(/\r?\n/).map((line) => line.trimEnd());
  const heading = lines.findIndex((line) => isSectionHeading(line));
  let start = heading;
  for (let index = heading - 1; heading > 0 && index >= Math.max(0, heading - 8); index--) {
    if (/^\s*capo\b/i.test(lines[index])) {
      start = index;
      break;
    }
  }
  const body = (start > 0 ? lines.slice(start) : lines).filter((line) => !PAGE_MARKER.test(line));
  while (body.length && (!body[body.length - 1].trim() || TRAILING_JUNK.test(body[body.length - 1]))) body.pop();
  return body.join("\n").replace(/\n{3,}/g, "\n\n");
}
