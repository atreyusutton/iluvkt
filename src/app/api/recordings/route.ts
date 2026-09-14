import { NextResponse } from "next/server";
import { insertRecording, readMeta } from "@/lib/recordings";
import { requireAuth } from "@/lib/require-auth";

/** Registers a take that the browser already uploaded straight to Vercel Blob. */
export async function POST(request: Request) {
  try {
    await requireAuth();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "Expected a JSON body." }, { status: 400 });
  }

  const key = String(body.pathname ?? "");
  const mimeType = String(body.mimeType ?? "");
  if (!key.startsWith("recordings/") || !/^(audio|video)\//.test(mimeType)) {
    return NextResponse.json({ error: "Invalid recording details." }, { status: 400 });
  }

  try {
    const meta = readMeta({ get: (name) => (body[name] === undefined || body[name] === null ? null : String(body[name])) });
    const recording = await insertRecording(
      { storage: "blob", key, mimeType, sizeBytes: Number(body.sizeBytes) || 0 },
      meta,
    );
    return NextResponse.json({ recording });
  } catch (error) {
    console.error("Saving recording metadata failed:", error);
    return NextResponse.json({ error: `Couldn't save recording: ${error instanceof Error ? error.message : "unknown error"}` }, { status: 500 });
  }
}
