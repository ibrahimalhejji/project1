import { mkdir } from "node:fs/promises";
import path from "node:path";
import { migrate } from "drizzle-orm/libsql/migrator";
import { eq } from "drizzle-orm";
import { db, databaseUrl } from "./index";
import { users } from "./schema";
import { hashPassword } from "@/lib/password";

const globalForBoot = globalThis as unknown as { __cmchubBooted?: Promise<void> };

/**
 * Creates the SQLite file + schema if needed and guarantees one admin account
 * (from ADMIN_EMAIL / ADMIN_PASSWORD). Safe to call many times.
 */
export function ensureDatabase(): Promise<void> {
  if (!globalForBoot.__cmchubBooted) {
    globalForBoot.__cmchubBooted = (async () => {
      const url = databaseUrl();
      if (url.startsWith("file:")) {
        const file = url.slice("file:".length);
        if (!file.startsWith(":")) await mkdir(path.dirname(path.resolve(file)), { recursive: true });
      }
      await migrate(db, { migrationsFolder: path.join(process.cwd(), "drizzle") });
      await ensureAdmin();
    })().catch((error) => {
      globalForBoot.__cmchubBooted = undefined;
      throw error;
    });
  }
  return globalForBoot.__cmchubBooted;
}

async function ensureAdmin() {
  const email = (process.env.ADMIN_EMAIL ?? "admin@cmchub.net").toLowerCase();
  const password = process.env.ADMIN_PASSWORD ?? "Admin12345!";
  const name = process.env.ADMIN_NAME ?? "CMC Hub Admin";
  const existing = await db.select({ id: users.id }).from(users).where(eq(users.email, email)).limit(1);
  if (existing.length === 0) {
    await db.insert(users).values({ name, email, passwordHash: await hashPassword(password), role: "admin" });
    console.log(`[cmchub] created admin account ${email}`);
  }
}
