"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { addBookmark, addVideo, removeBookmark, removeVideo } from "@/app/actions/songs";
import type { Video, VideoBookmark } from "@/db/schema";
import { formatClock } from "@/lib/time";
import { Button, cn } from "./ui";

type YTPlayer = {
  getCurrentTime(): number;
  seekTo(seconds: number, allowSeekAhead: boolean): void;
  setPlaybackRate(rate: number): void;
  playVideo(): void;
  destroy(): void;
};

declare global {
  interface Window {
    YT?: { Player: new (element: HTMLElement, options: object) => YTPlayer };
    onYouTubeIframeAPIReady?: () => void;
  }
}

let apiPromise: Promise<void> | null = null;
function loadYouTubeApi(): Promise<void> {
  if (window.YT?.Player) return Promise.resolve();
  apiPromise ??= new Promise<void>((resolve, reject) => {
    const previous = window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady = () => {
      previous?.();
      resolve();
    };
    const script = document.createElement("script");
    script.src = "https://www.youtube.com/iframe_api";
    script.onerror = () => {
      apiPromise = null;
      reject(new Error("Couldn't load the YouTube player."));
    };
    document.head.appendChild(script);
  });
  return apiPromise;
}

export type VideoWithBookmarks = Video & { bookmarks: VideoBookmark[] };

function Player({ video }: { video: VideoWithBookmarks }) {
  const mountRef = useRef<HTMLDivElement>(null);
  const playerRef = useRef<YTPlayer | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [rate, setRate] = useState(1);
  const [bookmarks, setBookmarks] = useState(video.bookmarks);
  const [note, setNote] = useState("");
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    let cancelled = false;
    loadYouTubeApi()
      .then(() => {
        if (cancelled || !mountRef.current || !window.YT) return;
        const target = document.createElement("div");
        mountRef.current.replaceChildren(target);
        playerRef.current = new window.YT.Player(target, {
          videoId: video.youtubeId,
          host: "https://www.youtube-nocookie.com",
          playerVars: { rel: 0, modestbranding: 1, playsinline: 1 },
        });
      })
      .catch((err: Error) => setError(err.message));
    return () => {
      cancelled = true;
      playerRef.current?.destroy();
      playerRef.current = null;
    };
  }, [video.youtubeId]);

  const seek = (seconds: number) => {
    playerRef.current?.seekTo(Math.max(0, seconds), true);
    playerRef.current?.playVideo();
  };

  const changeRate = (value: number) => {
    setRate(value);
    playerRef.current?.setPlaybackRate(value);
  };

  const saveBookmark = () => {
    const seconds = Math.floor(playerRef.current?.getCurrentTime() ?? 0);
    startTransition(async () => {
      const created = await addBookmark(video.id, seconds, note || `Bookmark at ${formatClock(seconds)}`);
      setBookmarks((current) => [...current, created].sort((a, b) => a.seconds - b.seconds));
      setNote("");
    });
  };

  return (
    <div className="space-y-3">
      <div className="aspect-video w-full overflow-hidden rounded-xl bg-black [&_iframe]:h-full [&_iframe]:w-full" ref={mountRef}>
        {error && <div className="grid h-full place-items-center text-sm text-white/80">{error}</div>}
      </div>

      <div className="flex flex-wrap items-center gap-2 text-sm">
        <span className="text-ink-3">Speed</span>
        {[0.5, 0.75, 1].map((value) => (
          <button
            key={value}
            onClick={() => changeRate(value)}
            className={cn("rounded-lg px-2.5 py-1 font-medium", rate === value ? "bg-accent text-accent-ink" : "bg-surface-2 text-ink-2")}
          >
            {value}×
          </button>
        ))}
        <button
          onClick={() => seek((playerRef.current?.getCurrentTime() ?? 0) - 10)}
          className="rounded-lg bg-surface-2 px-2.5 py-1 font-medium text-ink-2"
        >
          ↺ 10s
        </button>
      </div>

      <div className="flex gap-2">
        <input
          value={note}
          onChange={(event) => setNote(event.target.value)}
          onKeyDown={(event) => event.key === "Enter" && saveBookmark()}
          placeholder="Note for this moment, e.g. 'picking breakdown'"
          className="field"
        />
        <Button variant="secondary" onClick={saveBookmark} disabled={pending} className="shrink-0">
          + Bookmark
        </Button>
      </div>

      {bookmarks.length > 0 && (
        <ul className="divide-y divide-border rounded-xl border border-border">
          {bookmarks.map((bookmark) => (
            <li key={bookmark.id} className="flex items-center gap-3 px-3 py-2 text-sm">
              <button onClick={() => seek(bookmark.seconds)} className="font-mono tabular-nums text-accent hover:underline">
                {formatClock(bookmark.seconds)}
              </button>
              <button onClick={() => seek(bookmark.seconds)} className="flex-1 text-left">
                {bookmark.note}
              </button>
              <button
                aria-label="Remove bookmark"
                className="text-ink-3 hover:text-bad"
                onClick={() =>
                  startTransition(async () => {
                    await removeBookmark(video.id, bookmark.id);
                    setBookmarks((current) => current.filter((item) => item.id !== bookmark.id));
                  })
                }
              >
                ×
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/** Tutorial videos to watch for reference (not synced to anything), with timestamp bookmarks. */
export function TutorialVideos({
  videos,
  target,
  searchHint,
}: {
  videos: VideoWithBookmarks[];
  target: { songId?: number; lessonSlug?: string };
  searchHint?: { label: string; url: string };
}) {
  const [activeId, setActiveId] = useState(videos[0]?.id ?? null);
  const [url, setUrl] = useState("");
  const [title, setTitle] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const active = videos.find((video) => video.id === activeId) ?? videos[0];

  const submit = () => {
    setError(null);
    startTransition(async () => {
      const result = await addVideo(target, url, title);
      if (result.error) {
        setError(result.error);
        return;
      }
      setUrl("");
      setTitle("");
    });
  };

  return (
    <div className="space-y-4">
      {videos.length > 1 && (
        <div className="flex flex-wrap gap-2">
          {videos.map((video, index) => (
            <button
              key={video.id}
              onClick={() => setActiveId(video.id)}
              className={cn(
                "rounded-lg px-3 py-1.5 text-sm font-medium",
                active?.id === video.id ? "bg-ink text-bg" : "bg-surface-2 text-ink-2",
              )}
            >
              {video.title || `Video ${index + 1}`}
            </button>
          ))}
        </div>
      )}

      {active ? (
        <>
          <Player key={active.id} video={active} />
          <div className="flex justify-end">
            <button
              className="text-xs text-ink-3 hover:text-bad"
              onClick={() => {
                if (confirm("Remove this video and its bookmarks?")) startTransition(() => removeVideo(active.id));
              }}
            >
              Remove video
            </button>
          </div>
        </>
      ) : (
        <div className="rounded-xl border border-dashed border-border p-6 text-center text-sm text-ink-2">
          No tutorial yet. Paste a YouTube link below.
          {searchHint && (
            <>
              {" "}
              <a href={searchHint.url} target="_blank" rel="noreferrer" className="text-accent underline">
                {searchHint.label}
              </a>
            </>
          )}
        </div>
      )}

      <div className="grid gap-2 sm:grid-cols-[2fr_1fr_auto]">
        <input value={url} onChange={(event) => setUrl(event.target.value)} placeholder="YouTube link" className="field" />
        <input value={title} onChange={(event) => setTitle(event.target.value)} placeholder="Label (optional)" className="field" />
        <Button onClick={submit} disabled={!url || pending} variant="secondary">
          Add video
        </Button>
      </div>
      {error && <p className="text-sm text-bad">{error}</p>}
    </div>
  );
}
