import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { users, type User } from "@/db/schema";
import { SESSION_COOKIE, SESSION_TTL_SECONDS, sessionSecret, signSession, verifySession } from "./session";
import type { Locale } from "@/i18n/config";

export type CurrentUser = Pick<User, "id" | "name" | "email" | "role">;

export async function getCurrentUser(): Promise<CurrentUser | null> {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;
  if (!token) return null;
  const session = await verifySession(token, sessionSecret());
  if (!session) return null;
  const rows = await db
    .select({ id: users.id, name: users.name, email: users.email, role: users.role })
    .from(users)
    .where(eq(users.id, session.uid))
    .limit(1);
  return rows[0] ?? null;
}

export async function requireAdmin(locale: Locale): Promise<CurrentUser> {
  const user = await getCurrentUser();
  if (!user || !["admin", "organizer"].includes(user.role)) {
    redirect(`/${locale}/login?next=/${locale}/admin`);
  }
  return user;
}

export async function createSessionCookie(user: CurrentUser) {
  const token = await signSession({ uid: user.id, role: user.role, name: user.name }, sessionSecret());
  const store = await cookies();
  store.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SESSION_TTL_SECONDS,
  });
}

export async function clearSessionCookie() {
  const store = await cookies();
  store.delete(SESSION_COOKIE);
}
