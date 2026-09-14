import { NextResponse } from "next/server";
import { insertRecording, readMeta } from "@/lib/recordings";
import { requireAuth } from "@/lib/require-auth";
import { getServiceStatus } from "@/lib/services";
import { saveLocalRecordingStream } from "@/lib/storage";

export const maxDuration = 300;

/**
 * Local-mode upload: the raw audio/video body is streamed to disk.
 * Excluded from proxy.ts (which caps buffered bodies at 10MB), so auth is checked here.
 */
export async function POST(request: Request) {
  try {
    await requireAuth();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (getServiceStatus().recordings === "blob") {
    return NextResponse.json({ error: "Recordings go to Blob storage; use the direct upload." }, { status: 409 });
  }

  const mimeType = request.headers.get("content-type") ?? "";
  if (!/^(audio|video)\//.test(mimeType) || !request.body) {
    return NextResponse.json({ error: "Expected an audio or video body." }, { status: 400 });
  }

  try {
    const meta = readMeta(new URL(request.url).searchParams);
    const saved = await saveLocalRecordingStream(request.body, mimeType, meta.label);
    const recording = await insertRecording({ ...saved, mimeType }, meta);
    return NextResponse.json({ recording });
  } catch (error) {
    console.error("Saving local recording failed:", error);
    return NextResponse.json({ error: `Couldn't save recording: ${error instanceof Error ? error.message : "unknown error"}` }, { status: 500 });
  }
}
