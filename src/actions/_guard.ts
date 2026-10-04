import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { abstracts, conferences, registrations, sessions, speakers, sponsors, tracks } from "@/db/schema";
import { getCurrentUser, type CurrentUser } from "@/lib/auth";
import { isLocale, defaultLocale, type Locale } from "@/i18n/config";
import { str } from "@/lib/form";

/** Any signed-in organiser or administrator. */
export async function requireManager(): Promise<CurrentUser> {
  const user = await getCurrentUser();
  if (!user || !["admin", "organizer"].includes(user.role)) throw new Error("Unauthorized");
  return user;
}

/** Administrators only (site-wide data such as users and the inbox). */
export async function requireAdminAction(): Promise<CurrentUser> {
  const user = await getCurrentUser();
  if (!user || user.role !== "admin") throw new Error("Unauthorized");
  return user;
}

/** Administrators manage everything; organisers only the conferences they own. */
export async function canManageConference(user: CurrentUser, conferenceId: number): Promise<boolean> {
  if (user.role === "admin") return true;
  if (!conferenceId) return false;
  const rows = await db.select({ ownerId: conferences.ownerId }).from(conferences).where(eq(conferences.id, conferenceId)).limit(1);
  return !!rows[0] && rows[0].ownerId === user.id;
}

export async function assertConference(user: CurrentUser, conferenceId: number): Promise<void> {
  if (!(await canManageConference(user, conferenceId))) throw new Error("Forbidden");
}

export type OwnedKind = "sessions" | "tracks" | "speakers" | "sponsors" | "registrations" | "abstracts";

export async function conferenceIdOf(kind: OwnedKind, id: number): Promise<number | null> {
  if (!id) return null;
  let rows: Array<{ conferenceId: number }>;
  switch (kind) {
    case "sessions":
      rows = await db.select({ conferenceId: sessions.conferenceId }).from(sessions).where(eq(sessions.id, id)).limit(1);
      break;
    case "tracks":
      rows = await db.select({ conferenceId: tracks.conferenceId }).from(tracks).where(eq(tracks.id, id)).limit(1);
      break;
    case "speakers":
      rows = await db.select({ conferenceId: speakers.conferenceId }).from(speakers).where(eq(speakers.id, id)).limit(1);
      break;
    case "sponsors":
      rows = await db.select({ conferenceId: sponsors.conferenceId }).from(sponsors).where(eq(sponsors.id, id)).limit(1);
      break;
    case "registrations":
      rows = await db.select({ conferenceId: registrations.conferenceId }).from(registrations).where(eq(registrations.id, id)).limit(1);
      break;
    case "abstracts":
      rows = await db.select({ conferenceId: abstracts.conferenceId }).from(abstracts).where(eq(abstracts.id, id)).limit(1);
      break;
  }
  return rows[0]?.conferenceId ?? null;
}

/** Resolves the entity's conference and checks the caller may manage it. */
export async function assertOwned(user: CurrentUser, kind: OwnedKind, id: number): Promise<number> {
  const conferenceId = await conferenceIdOf(kind, id);
  if (!conferenceId) throw new Error("Not found");
  await assertConference(user, conferenceId);
  return conferenceId;
}

export function localeFrom(form: FormData): Locale {
  const value = str(form, "locale");
  return isLocale(value) ? value : defaultLocale;
}

export function revalidateAll() {
  revalidatePath("/", "layout");
}
