"use client";

import { useSyncExternalStore } from "react";

/**
 * The running practice session lives in localStorage so the timer survives page
 * navigation and reloads — you can hop to the tuner or a song page mid-session.
 */
export type PracticeState = {
  sessionId: number;
  accumulatedMs: number;
  runningSince: number | null;
  draft: SessionDraft;
};

export type SessionDraft = {
  focusAreas: string[];
  songId: number | null;
  sectionIds: number[];
  bpm: number | null;
  rating: number | null;
  notes: string;
};

export const EMPTY_DRAFT: SessionDraft = {
  focusAreas: [],
  songId: null,
  sectionIds: [],
  bpm: null,
  rating: null,
  notes: "",
};

const STORAGE_KEY = "iluvkt.practice";
const listeners = new Set<() => void>();
let cachedRaw: string | null | undefined;
let cachedState: PracticeState | null = null;

function readRaw(): string | null {
  try {
    return window.localStorage.getItem(STORAGE_KEY);
  } catch (error) {
    console.warn("localStorage unavailable; practice timer won't persist across reloads.", error);
    return null;
  }
}

function getSnapshot(): PracticeState | null {
  const raw = readRaw();
  if (raw !== cachedRaw) {
    cachedRaw = raw;
    try {
      cachedState = raw ? (JSON.parse(raw) as PracticeState) : null;
    } catch (error) {
      console.warn("Discarding corrupt practice state.", error);
      cachedState = null;
    }
  }
  return cachedState;
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  const onStorage = (event: StorageEvent) => {
    if (event.key === STORAGE_KEY) listener();
  };
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", onStorage);
  };
}

export function setPracticeState(next: PracticeState | null) {
  try {
    if (next) window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    else window.localStorage.removeItem(STORAGE_KEY);
  } catch (error) {
    console.warn("Couldn't persist practice state.", error);
    cachedRaw = next ? JSON.stringify(next) : null;
    cachedState = next;
  }
  listeners.forEach((listener) => listener());
}

export function getPracticeState() {
  return getSnapshot();
}

export function updateDraft(patch: Partial<SessionDraft>) {
  const current = getSnapshot();
  if (!current) return;
  setPracticeState({ ...current, draft: { ...current.draft, ...patch } });
}

export function usePracticeState(): PracticeState | null {
  return useSyncExternalStore(subscribe, getSnapshot, () => null);
}

export function elapsedMs(state: PracticeState | null, now: number): number {
  if (!state) return 0;
  return state.accumulatedMs + (state.runningSince ? Math.max(0, now - state.runningSince) : 0);
}
