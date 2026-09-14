import { desc, eq } from "drizzle-orm";
import { getDb } from "@/db";
import { drillResults } from "@/db/schema";
import { PageHeader } from "@/components/ui";
import { ChordChangeDrill } from "./chord-change-drill";

export const metadata = { title: "One-minute changes" };

export default async function ChordChangesPage() {
  const db = await getDb();
  const results = await db
    .select()
    .from(drillResults)
    .where(eq(drillResults.type, "chord-change"))
    .orderBy(desc(drillResults.createdAt));

  return (
    <div>
      <PageHeader
        eyebrow="Tools"
        title="One-minute changes"
        subtitle="Strum once, switch, strum once, switch — for 60 seconds. Only count changes where every string rings."
      />
      <ChordChangeDrill
        results={results.map((result) => ({
          id: result.id,
          key: result.key,
          score: result.score,
          createdAt: result.createdAt.toISOString(),
        }))}
      />
    </div>
  );
}
