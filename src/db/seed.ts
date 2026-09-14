import { DONT_THINK_TWICE } from "@/content/songs";
import type { Db } from "./index";
import { settings, songSections, songs } from "./schema";

/** Idempotent: creates the settings row and the first song only on an empty database. */
export async function seedDatabase(db: Db) {
  await db.insert(settings).values({ id: 1 }).onConflictDoNothing();

  const existing = await db.select({ id: songs.id }).from(songs).limit(1);
  if (existing.length > 0) return;

  const { sections, ...song } = DONT_THINK_TWICE;
  const [created] = await db.insert(songs).values(song).returning({ id: songs.id });
  await db.insert(songSections).values(
    sections.map((section, position) => ({ songId: created.id, position, ...section })),
  );
}
