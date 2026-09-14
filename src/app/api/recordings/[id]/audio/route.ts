import { eq } from "drizzle-orm";
import { getDb } from "@/db";
import { recordings } from "@/db/schema";
import { streamRecording } from "@/lib/storage";

// Auth is enforced by proxy.ts for all /api routes.
export async function GET(request: Request, context: RouteContext<"/api/recordings/[id]/audio">) {
  const { id } = await context.params;
  const recordingId = Number.parseInt(id, 10);
  if (!Number.isFinite(recordingId)) return new Response("Bad id", { status: 400 });

  const db = await getDb();
  const [recording] = await db.select().from(recordings).where(eq(recordings.id, recordingId));
  if (!recording) return new Response("Not found", { status: 404 });

  return streamRecording(recording, request.headers.get("range"));
}
