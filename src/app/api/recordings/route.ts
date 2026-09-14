import { NextResponse } from "next/server";
import { getDb } from "@/db";
import { recordings } from "@/db/schema";
import { requireAuth } from "@/lib/require-auth";
import { saveRecordingFile } from "@/lib/storage";

export const maxDuration = 60;

function optionalInt(value: FormDataEntryValue | null): number | null {
  const parsed = Number.parseInt(String(value ?? ""), 10);
  return Number.isFinite(parsed) ? parsed : null;
}

export async function POST(request: Request) {
  try {
    await requireAuth();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const form = await request.formData();
  const file = form.get("file");
  if (!(file instanceof Blob) || file.size === 0) {
    return NextResponse.json({ error: "No audio received." }, { status: 400 });
  }

  try {
    const saved = await saveRecordingFile(file);
    const db = await getDb();
    const [recording] = await db
      .insert(recordings)
      .values({
        ...saved,
        mimeType: file.type || "audio/webm",
        sessionId: optionalInt(form.get("sessionId")),
        songId: optionalInt(form.get("songId")),
        durationSeconds: optionalInt(form.get("durationSeconds")) ?? 0,
        label: String(form.get("label") ?? "").trim(),
      })
      .returning();
    return NextResponse.json({ recording });
  } catch (error) {
    console.error("Saving recording failed:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: `Couldn't save recording: ${message}` }, { status: 500 });
  }
}
