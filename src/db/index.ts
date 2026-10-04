import { createClient, type Client } from "@libsql/client";
import { drizzle } from "drizzle-orm/libsql";
import * as schema from "./schema";

export function databaseUrl(): string {
  return process.env.DATABASE_URL ?? "file:./data/cmchub.db";
}

const globalForDb = globalThis as unknown as { __cmchubClient?: Client };

function getClient(): Client {
  if (!globalForDb.__cmchubClient) {
    globalForDb.__cmchubClient = createClient({
      url: databaseUrl(),
      authToken: process.env.DATABASE_AUTH_TOKEN,
    });
  }
  return globalForDb.__cmchubClient;
}

export const db = drizzle(getClient(), { schema });
export type Db = typeof db;
export { schema };
