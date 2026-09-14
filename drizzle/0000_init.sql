CREATE TABLE "drill_results" (
	"id" serial PRIMARY KEY NOT NULL,
	"type" text NOT NULL,
	"key" text NOT NULL,
	"score" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "lesson_progress" (
	"lesson_slug" text PRIMARY KEY NOT NULL,
	"completed_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "practice_sessions" (
	"id" serial PRIMARY KEY NOT NULL,
	"kind" text DEFAULT 'timed' NOT NULL,
	"status" text DEFAULT 'active' NOT NULL,
	"started_at" timestamp with time zone DEFAULT now() NOT NULL,
	"ended_at" timestamp with time zone,
	"duration_seconds" integer DEFAULT 0 NOT NULL,
	"song_id" integer,
	"focus_areas" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"section_ids" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"bpm" integer,
	"rating" integer,
	"notes" text DEFAULT '' NOT NULL,
	"journal_status" text DEFAULT 'none' NOT NULL,
	"journal" jsonb,
	"journal_error" text
);
--> statement-breakpoint
CREATE TABLE "recordings" (
	"id" serial PRIMARY KEY NOT NULL,
	"session_id" integer,
	"song_id" integer,
	"storage" text NOT NULL,
	"key" text NOT NULL,
	"mime_type" text NOT NULL,
	"size_bytes" integer DEFAULT 0 NOT NULL,
	"duration_seconds" integer DEFAULT 0 NOT NULL,
	"label" text DEFAULT '' NOT NULL,
	"starred" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "settings" (
	"id" integer PRIMARY KEY NOT NULL,
	"daily_goal_minutes" integer DEFAULT 30 NOT NULL,
	"playing_for" text,
	"performance_date" text,
	"performance_note" text
);
--> statement-breakpoint
CREATE TABLE "song_sections" (
	"id" serial PRIMARY KEY NOT NULL,
	"song_id" integer NOT NULL,
	"name" text NOT NULL,
	"position" integer DEFAULT 0 NOT NULL,
	"bars" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"status" text DEFAULT 'learning' NOT NULL,
	"best_bpm" integer,
	"notes" text DEFAULT '' NOT NULL
);
--> statement-breakpoint
CREATE TABLE "songs" (
	"id" serial PRIMARY KEY NOT NULL,
	"title" text NOT NULL,
	"artist" text DEFAULT '' NOT NULL,
	"capo" integer DEFAULT 0 NOT NULL,
	"tuning" text DEFAULT 'Standard (E A D G B E)' NOT NULL,
	"target_bpm" integer DEFAULT 100 NOT NULL,
	"beats_per_bar" integer DEFAULT 4 NOT NULL,
	"chord_sheet" text DEFAULT '' NOT NULL,
	"picking_pattern" jsonb,
	"strumming_pattern" text,
	"notes" text DEFAULT '' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "video_bookmarks" (
	"id" serial PRIMARY KEY NOT NULL,
	"video_id" integer NOT NULL,
	"seconds" integer NOT NULL,
	"note" text DEFAULT '' NOT NULL
);
--> statement-breakpoint
CREATE TABLE "videos" (
	"id" serial PRIMARY KEY NOT NULL,
	"song_id" integer,
	"lesson_slug" text,
	"youtube_id" text NOT NULL,
	"title" text DEFAULT '' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "practice_sessions" ADD CONSTRAINT "practice_sessions_song_id_songs_id_fk" FOREIGN KEY ("song_id") REFERENCES "public"."songs"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "recordings" ADD CONSTRAINT "recordings_session_id_practice_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."practice_sessions"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "recordings" ADD CONSTRAINT "recordings_song_id_songs_id_fk" FOREIGN KEY ("song_id") REFERENCES "public"."songs"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "song_sections" ADD CONSTRAINT "song_sections_song_id_songs_id_fk" FOREIGN KEY ("song_id") REFERENCES "public"."songs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "video_bookmarks" ADD CONSTRAINT "video_bookmarks_video_id_videos_id_fk" FOREIGN KEY ("video_id") REFERENCES "public"."videos"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "videos" ADD CONSTRAINT "videos_song_id_songs_id_fk" FOREIGN KEY ("song_id") REFERENCES "public"."songs"("id") ON DELETE cascade ON UPDATE no action;