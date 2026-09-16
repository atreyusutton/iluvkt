"use client";

import { useSyncExternalStore } from "react";
import { clampBpm } from "./audio/metronome";

/**
 * Tempo settings for the site-wide metronome, kept in localStorage so the click you were
 * using yesterday is still set when you come back. Read through useSyncExternalStore rather
 * than an effect so the server render and the first client render agree.
 */
export type MetronomeSettings = { bpm: number; beatsPerBar: number; accent: boolean };

export const DEFAULT_SETTINGS: MetronomeSettings = { bpm: 80, beatsPerBar: 4, accent: true };

const STORAGE_KEY = "iluvkt.metronome";
const listeners = new Set<() => void>();
let cachedRaw: string | null | undefined;
let cachedSettings: MetronomeSettings = DEFAULT_SETTINGS;

function readRaw(): string | null {
  try {
    return window.localStorage.getItem(STORAGE_KEY);
  } catch (error) {
    console.warn("localStorage unavailable; metronome settings won't persist.", error);
    return null;
  }
}

// The cached object is returned by reference until the stored string actually changes —
// useSyncExternalStore re-renders forever if the snapshot is a fresh object every call.
function getSnapshot(): MetronomeSettings {
  const raw = readRaw();
  if (raw !== cachedRaw) {
    cachedRaw = raw;
    try {
      const parsed = raw ? (JSON.parse(raw) as Partial<MetronomeSettings>) : null;
      cachedSettings = parsed
        ? {
            bpm: clampBpm(parsed.bpm ?? DEFAULT_SETTINGS.bpm),
            beatsPerBar: parsed.beatsPerBar ?? DEFAULT_SETTINGS.beatsPerBar,
            accent: parsed.accent ?? DEFAULT_SETTINGS.accent,
          }
        : DEFAULT_SETTINGS;
    } catch (error) {
      console.warn("Discarding corrupt metronome settings.", error);
      cachedSettings = DEFAULT_SETTINGS;
    }
  }
  return cachedSettings;
}

function getServerSnapshot(): MetronomeSettings {
  return DEFAULT_SETTINGS;
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

export function setMetronomeSettings(patch: Partial<MetronomeSettings>) {
  const next = { ...getSnapshot(), ...patch };
  if (patch.bpm !== undefined) next.bpm = clampBpm(patch.bpm);
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch (error) {
    console.warn("Couldn't persist metronome settings.", error);
    cachedRaw = JSON.stringify(next);
    cachedSettings = next;
  }
  listeners.forEach((listener) => listener());
}

export function useMetronomeSettings(): MetronomeSettings {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
