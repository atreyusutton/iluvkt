import {
  boolean,
  integer,
  jsonb,
  pgTable,
  serial,
  text,
  timestamp,
} from "drizzle-orm/pg-core";

/** A single bar of a progression: which chord and how many beats it lasts. */
export type Bar = { chord: string; beats: number };

/**
 * One eighth-note step of a fingerpicking pattern.
 * `bass` picks the chord's root or alternate bass string; `treble` lists string numbers (1 = high E).
 */
export type PickStep = { bass: "root" | "alt" | null; treble: number[] };
export type PickingPattern = { name: string; description: string; steps: PickStep[] };

export type JournalEntry = {
  title: string;
  whatIPracticed: string;
  progress: string;
  wins: string[];
  focusNext: string[];
  encouragement: string;
};

export const settings = pgTable("settings", {
  id: integer("id").primaryKey(),
  dailyGoalMinutes: integer("daily_goal_minutes").notNull().default(30),
  playingFor: text("playing_for"),
  performanceDate: text("performance_date"),
  performanceNote: text("performance_note"),
});

export const songs = pgTable("songs", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  artist: text("artist").notNull().default(""),
  capo: integer("capo").notNull().default(0),
  tuning: text("tuning").notNull().default("Standard (E A D G B E)"),
  targetBpm: integer("target_bpm").notNull().default(100),
  beatsPerBar: integer("beats_per_bar").notNull().default(4),
  chordSheet: text("chord_sheet").notNull().default(""),
  pickingPattern: jsonb("picking_pattern").$type<PickingPattern>(),
  strummingPattern: text("strumming_pattern"),
  notes: text("notes").notNull().default(""),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const songSections = pgTable("song_sections", {
  id: serial("id").primaryKey(),
  songId: integer("song_id")
    .notNull()
    .references(() => songs.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  position: integer("position").notNull().default(0),
  bars: jsonb("bars").$type<Bar[]>().notNull().default([]),
  status: text("status").$type<"learning" | "okay" | "nailed">().notNull().default("learning"),
  bestBpm: integer("best_bpm"),
  notes: text("notes").notNull().default(""),
});

export const videos = pgTable("videos", {
  id: serial("id").primaryKey(),
  songId: integer("song_id").references(() => songs.id, { onDelete: "cascade" }),
  lessonSlug: text("lesson_slug"),
  youtubeId: text("youtube_id").notNull(),
  title: text("title").notNull().default(""),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const videoBookmarks = pgTable("video_bookmarks", {
  id: serial("id").primaryKey(),
  videoId: integer("video_id")
    .notNull()
    .references(() => videos.id, { onDelete: "cascade" }),
  seconds: integer("seconds").notNull(),
  note: text("note").notNull().default(""),
});

export const practiceSessions = pgTable("practice_sessions", {
  id: serial("id").primaryKey(),
  kind: text("kind").$type<"timed" | "manual">().notNull().default("timed"),
  status: text("status").$type<"active" | "completed">().notNull().default("active"),
  startedAt: timestamp("started_at", { withTimezone: true }).notNull().defaultNow(),
  endedAt: timestamp("ended_at", { withTimezone: true }),
  durationSeconds: integer("duration_seconds").notNull().default(0),
  songId: integer("song_id").references(() => songs.id, { onDelete: "set null" }),
  focusAreas: jsonb("focus_areas").$type<string[]>().notNull().default([]),
  sectionIds: jsonb("section_ids").$type<number[]>().notNull().default([]),
  bpm: integer("bpm"),
  rating: integer("rating"),
  notes: text("notes").notNull().default(""),
  journalStatus: text("journal_status")
    .$type<"none" | "pending" | "ready" | "error">()
    .notNull()
    .default("none"),
  journal: jsonb("journal").$type<JournalEntry>(),
  journalError: text("journal_error"),
});

export const recordings = pgTable("recordings", {
  id: serial("id").primaryKey(),
  sessionId: integer("session_id").references(() => practiceSessions.id, { onDelete: "set null" }),
  songId: integer("song_id").references(() => songs.id, { onDelete: "set null" }),
  storage: text("storage").$type<"local" | "blob">().notNull(),
  key: text("key").notNull(),
  mimeType: text("mime_type").notNull(),
  sizeBytes: integer("size_bytes").notNull().default(0),
  durationSeconds: integer("duration_seconds").notNull().default(0),
  label: text("label").notNull().default(""),
  starred: boolean("starred").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const lessonProgress = pgTable("lesson_progress", {
  lessonSlug: text("lesson_slug").primaryKey(),
  completedAt: timestamp("completed_at", { withTimezone: true }).notNull().defaultNow(),
});

export const drillResults = pgTable("drill_results", {
  id: serial("id").primaryKey(),
  type: text("type").$type<"chord-change" | "fretboard">().notNull(),
  key: text("key").notNull(),
  score: integer("score").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export type Song = typeof songs.$inferSelect;
export type SongSection = typeof songSections.$inferSelect;
export type Video = typeof videos.$inferSelect;
export type VideoBookmark = typeof videoBookmarks.$inferSelect;
export type PracticeSession = typeof practiceSessions.$inferSelect;
export type Recording = typeof recordings.$inferSelect;
export type DrillResult = typeof drillResults.$inferSelect;
export type Settings = typeof settings.$inferSelect;
