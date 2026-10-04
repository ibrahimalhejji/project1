"use server";

import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { users } from "@/db/schema";
import { clearSessionCookie, createSessionCookie } from "@/lib/auth";
import { verifyPassword } from "@/lib/password";
import { str, type ActionState } from "@/lib/form";
import { isLocale, defaultLocale } from "@/i18n/config";
import { getDict } from "@/i18n/dictionaries";

export async function login(_prev: ActionState, form: FormData): Promise<ActionState> {
  const locale = isLocale(str(form, "locale")) ? (str(form, "locale") as "ar" | "en") : defaultLocale;
  const dict = getDict(locale);
  const email = str(form, "email", 200).toLowerCase();
  const password = str(form, "password", 200);
  const next = str(form, "next", 300);

  if (!email || !password) return { ok: false, message: dict.login.error };
  const rows = await db.select().from(users).where(eq(users.email, email)).limit(1);
  const user = rows[0];
  if (!user || !["admin", "organizer"].includes(user.role) || !(await verifyPassword(password, user.passwordHash))) {
    return { ok: false, message: dict.login.error };
  }
  await createSessionCookie({ id: user.id, name: user.name, email: user.email, role: user.role });
  redirect(next.startsWith(`/${locale}/`) ? next : `/${locale}/admin`);
}

export async function logout(form: FormData) {
  const locale = isLocale(str(form, "locale")) ? str(form, "locale") : defaultLocale;
  await clearSessionCookie();
  redirect(`/${locale}`);
}
