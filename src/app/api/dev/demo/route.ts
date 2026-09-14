import { NextResponse } from "next/server";
import { clearPracticeData, seedDemoData } from "@/lib/demo/seed-demo";
import { requireAuth } from "@/lib/require-auth";
import { getTimezone } from "@/lib/timezone";

export const maxDuration = 120;

/** Development-only: load or wipe 14 days of sample practice data. */
export async function POST(request: Request) {
  if (process.env.NODE_ENV !== "development") {
    return NextResponse.json({ error: "Not available" }, { status: 404 });
  }
  try {
    await requireAuth();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { action } = (await request.json().catch((error: unknown) => {
    console.warn("Demo route received a non-JSON body", error);
    return {};
  })) as { action?: string };

  try {
    if (action === "seed") return NextResponse.json(await seedDemoData(await getTimezone()));
    if (action === "clear") return NextResponse.json(await clearPracticeData());
    return NextResponse.json({ error: "action must be 'seed' or 'clear'" }, { status: 400 });
  } catch (error) {
    console.error("Demo data action failed:", error);
    return NextResponse.json({ error: error instanceof Error ? error.message : "Demo action failed" }, { status: 500 });
  }
}
