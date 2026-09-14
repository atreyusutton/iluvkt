import "server-only";
import { createReadStream, createWriteStream } from "node:fs";
import { mkdir, rm, stat } from "node:fs/promises";
import path from "node:path";
import { Readable } from "node:stream";
import { pipeline } from "node:stream/promises";
import { del, get } from "@vercel/blob";
import type { Recording } from "@/db/schema";

const LOCAL_DIR = path.join(process.cwd(), ".data", "recordings");

export function extensionFor(mimeType: string): string {
  if (mimeType.startsWith("video/mp4")) return "mp4";
  if (mimeType.includes("mp4") || mimeType.includes("m4a")) return "m4a";
  if (mimeType.includes("ogg")) return "ogg";
  if (mimeType.includes("wav")) return "wav";
  return "webm";
}

/** Streams an upload straight to disk so long video takes never sit in memory. */
export async function saveLocalRecordingStream(
  body: ReadableStream<Uint8Array>,
  mimeType: string,
): Promise<{ storage: "local"; key: string; sizeBytes: number }> {
  await mkdir(LOCAL_DIR, { recursive: true });
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  const filename = `${stamp}-${crypto.randomUUID().slice(0, 8)}.${extensionFor(mimeType)}`;
  const filePath = path.join(LOCAL_DIR, filename);
  try {
    await pipeline(Readable.fromWeb(body as import("node:stream/web").ReadableStream), createWriteStream(filePath));
  } catch (error) {
    await rm(filePath, { force: true });
    throw error;
  }
  return { storage: "local", key: filename, sizeBytes: (await stat(filePath)).size };
}

export async function deleteRecordingFile(recording: Recording) {
  if (recording.storage === "blob") {
    await del(recording.key);
    return;
  }
  await rm(path.join(LOCAL_DIR, path.basename(recording.key)), { force: true });
}

/** Streams a recording back, honouring Range requests so the audio element can seek. */
export async function streamRecording(recording: Recording, rangeHeader: string | null): Promise<Response> {
  if (recording.storage === "blob") {
    const result = await get(recording.key, {
      access: "private",
      headers: rangeHeader ? { range: rangeHeader } : undefined,
    });
    if (!result || result.statusCode !== 200) {
      return new Response("Recording not found in blob storage", { status: 404 });
    }
    const contentRange = result.headers.get("content-range");
    const headers = new Headers({
      "Content-Type": recording.mimeType,
      "Accept-Ranges": "bytes",
      "Cache-Control": "private, max-age=3600",
    });
    const length = result.headers.get("content-length");
    if (length) headers.set("Content-Length", length);
    if (contentRange) headers.set("Content-Range", contentRange);
    return new Response(result.stream, { status: contentRange ? 206 : 200, headers });
  }

  const filePath = path.join(LOCAL_DIR, path.basename(recording.key));
  let size: number;
  try {
    size = (await stat(filePath)).size;
  } catch {
    return new Response("Recording file missing on disk", { status: 404 });
  }

  const match = rangeHeader?.match(/bytes=(\d*)-(\d*)/);
  if (match && (match[1] || match[2])) {
    const start = match[1] ? Number(match[1]) : Math.max(0, size - Number(match[2]));
    const end = match[1] && match[2] ? Math.min(Number(match[2]), size - 1) : size - 1;
    const stream = Readable.toWeb(createReadStream(filePath, { start, end })) as ReadableStream;
    return new Response(stream, {
      status: 206,
      headers: {
        "Content-Type": recording.mimeType,
        "Content-Length": String(end - start + 1),
        "Content-Range": `bytes ${start}-${end}/${size}`,
        "Accept-Ranges": "bytes",
      },
    });
  }

  const stream = Readable.toWeb(createReadStream(filePath)) as ReadableStream;
  return new Response(stream, {
    headers: {
      "Content-Type": recording.mimeType,
      "Content-Length": String(size),
      "Accept-Ranges": "bytes",
    },
  });
}
