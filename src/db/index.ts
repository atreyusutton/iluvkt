import "server-only";
import path from "node:path";
import type { PgDatabase, PgQueryResultHKT } from "drizzle-orm/pg-core";
import * as schema from "./schema";
import { seedDatabase } from "./seed";

export type Db = PgDatabase<PgQueryResultHKT, typeof schema>;

const MIGRATIONS_FOLDER = path.join(process.cwd(), "drizzle");
const LOCAL_DATA_DIR = path.join(process.cwd(), ".data", "pglite");

/**
 * Neon Postgres when DATABASE_URL is set (production), otherwise an embedded
 * PGlite database on disk so the app runs locally with zero setup.
 */
async function createDb(): Promise<Db> {
  if (process.env.DATABASE_URL) {
    const { neon } = await import("@neondatabase/serverless");
    const { drizzle } = await import("drizzle-orm/neon-http");
    const { migrate } = await import("drizzle-orm/neon-http/migrator");
    const db = drizzle(neon(process.env.DATABASE_URL), { schema });
    await migrate(db, { migrationsFolder: MIGRATIONS_FOLDER });
    return db as unknown as Db;
  }

  const { mkdir } = await import("node:fs/promises");
  const { PGlite } = await import("@electric-sql/pglite");
  const { drizzle } = await import("drizzle-orm/pglite");
  const { migrate } = await import("drizzle-orm/pglite/migrator");
  await mkdir(LOCAL_DATA_DIR, { recursive: true });
  const db = drizzle(new PGlite(LOCAL_DATA_DIR), { schema });
  await migrate(db, { migrationsFolder: MIGRATIONS_FOLDER });
  return db as unknown as Db;
}

// Cached on globalThis so dev hot-reloads don't open PGlite twice.
const globalForDb = globalThis as unknown as { __iluvktDb?: Promise<Db> };

export function getDb(): Promise<Db> {
  if (!globalForDb.__iluvktDb) {
    globalForDb.__iluvktDb = createDb()
      .then(async (db) => {
        await seedDatabase(db);
        return db;
      })
      .catch((error: unknown) => {
        // Don't cache a failed connection; the next request retries.
        globalForDb.__iluvktDb = undefined;
        throw error;
      });
  }
  return globalForDb.__iluvktDb;
}

export { schema };
