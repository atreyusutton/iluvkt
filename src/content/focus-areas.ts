export const FOCUS_AREAS = [
  "Warm-up",
  "Tuning",
  "Chord changes",
  "Picking pattern",
  "Strumming",
  "Song sections",
  "Full run-through",
  "Lesson",
  "Fretboard / theory",
  "Recording",
] as const;

export type FocusArea = (typeof FOCUS_AREAS)[number];
