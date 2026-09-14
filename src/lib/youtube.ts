/** Extracts the 11-character video id from any common YouTube URL (or a bare id). */
export function parseYouTubeId(input: string): string | null {
  const value = input.trim();
  if (/^[\w-]{11}$/.test(value)) return value;
  try {
    const url = new URL(value);
    const host = url.hostname.replace(/^www\.|^m\./, "");
    if (host === "youtu.be") return url.pathname.slice(1, 12) || null;
    if (host === "youtube.com" || host === "youtube-nocookie.com" || host === "music.youtube.com") {
      const v = url.searchParams.get("v");
      if (v) return v.slice(0, 11);
      const match = url.pathname.match(/\/(?:embed|shorts|live|v)\/([\w-]{11})/);
      return match?.[1] ?? null;
    }
  } catch (error) {
    if (!(error instanceof TypeError)) throw error;
    // Not a URL and not a bare id.
  }
  return null;
}

export function youtubeSearchUrl(query: string): string {
  return `https://www.youtube.com/results?search_query=${encodeURIComponent(query)}`;
}
