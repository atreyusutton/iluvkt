import { handleUpload, type HandleUploadBody } from "@vercel/blob/client";
import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/require-auth";

/** Issues short-lived tokens so the browser can upload big video takes directly to Blob storage. */
export async function POST(request: Request) {
  try {
    await requireAuth();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = (await request.json()) as HandleUploadBody;
    const result = await handleUpload({
      body,
      request,
      onBeforeGenerateToken: async (pathname) => {
        if (!pathname.startsWith("recordings/")) throw new Error("Uploads must go under recordings/");
        return {
          allowedContentTypes: ["audio/*", "video/*"],
          maximumSizeInBytes: 2 * 1024 * 1024 * 1024,
          addRandomSuffix: true,
        };
      },
    });
    return NextResponse.json(result);
  } catch (error) {
    console.error("Blob upload token failed:", error);
    return NextResponse.json({ error: error instanceof Error ? error.message : "Upload failed" }, { status: 400 });
  }
}
