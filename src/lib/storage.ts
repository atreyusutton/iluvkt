import "server-only";
import { createReadStream } from "node:fs";
import { mkdir, rm, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import { Readable } from "node:stream";
import { del, get, put } from "@vercel/blob";
import type { Recording } from "@/db/schema";
import { getServiceStatus } from "./services";

const LOCAL_DIR = path.join(process.cwd(), ".data", "recordings");

function extensionFor(mimeType: string): string {
  if (mimeType.includes("mp4") || mimeType.includes("m4a")) return "m4a";
  if (mimeType.includes("ogg")) return "ogg";
  if (mimeType.includes("wav")) return "wav";
  return "webm";
}

export async function saveRecordingFile(
  file: Blob,
): Promise<{ storage: Recording["storage"]; key: string; sizeBytes: number }> {
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  const filename = `${stamp}-${crypto.randomUUID().slice(0, 8)}.${extensionFor(file.type)}`;

  if (getServiceStatus().recordings === "blob") {
    const blob = await put(`recordings/${filename}`, file, {
      access: "private",
      contentType: file.type,
    });
    return { storage: "blob", key: blob.pathname, sizeBytes: file.size };
  }

  await mkdir(LOCAL_DIR, { recursive: true });
  await writeFile(path.join(LOCAL_DIR, filename), Buffer.from(await file.arrayBuffer()));
  return { storage: "local", key: filename, sizeBytes: file.size };
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
    const result = await get(recording.key, { access: "private" });
    if (!result || result.statusCode !== 200) {
      return new Response("Recording not found in blob storage", { status: 404 });
    }
    return new Response(result.stream, {
      headers: {
        "Content-Type": recording.mimeType,
        "Content-Length": String(result.blob.size),
        "Cache-Control": "private, max-age=3600",
      },
    });
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
