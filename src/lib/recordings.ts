import "server-only";
import { getDb } from "@/db";
import { recordings, type Recording } from "@/db/schema";

export type RecordingMeta = {
  sessionId: number | null;
  songId: number | null;
  durationSeconds: number;
  label: string;
};

function optionalInt(value: unknown): number | null {
  const parsed = Number.parseInt(String(value ?? ""), 10);
  return Number.isFinite(parsed) ? parsed : null;
}

export function readMeta(source: { get(name: string): string | null }): RecordingMeta {
  return {
    sessionId: optionalInt(source.get("sessionId")),
    songId: optionalInt(source.get("songId")),
    durationSeconds: Math.max(0, optionalInt(source.get("durationSeconds")) ?? 0),
    label: (source.get("label") ?? "").trim().slice(0, 200),
  };
}

export async function insertRecording(
  file: { storage: Recording["storage"]; key: string; sizeBytes: number; mimeType: string },
  meta: RecordingMeta,
) {
  const db = await getDb();
  const [recording] = await db.insert(recordings).values({ ...file, ...meta }).returning();
  return recording;
}
