import { desc, eq } from "drizzle-orm";
import { getDb } from "@/db";
import { drillResults } from "@/db/schema";
import { PageHeader } from "@/components/ui";
import { FretboardTrainer } from "./fretboard-trainer";

export const metadata = { title: "Fretboard trainer" };

export default async function FretboardPage() {
  const db = await getDb();
  const results = await db
    .select({ key: drillResults.key, score: drillResults.score })
    .from(drillResults)
    .where(eq(drillResults.type, "fretboard"))
    .orderBy(desc(drillResults.createdAt));

  const bestByMode: Record<string, number> = {};
  for (const result of results) bestByMode[result.key] = Math.max(bestByMode[result.key] ?? 0, result.score);

  return (
    <div>
      <PageHeader
        eyebrow="Tools"
        title="Fretboard trainer"
        subtitle="Name the highlighted note as many times as you can in 60 seconds."
      />
      <FretboardTrainer bestByMode={bestByMode} />
    </div>
  );
}
