"use server";

import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { users } from "@/db/schema";
import { clearSessionCookie, createSessionCookie } from "@/lib/auth";
import { hashPassword, verifyPassword } from "@/lib/password";
import { str, type ActionState } from "@/lib/form";
import { isValidEmail } from "@/lib/utils";
import { isLocale, defaultLocale } from "@/i18n/config";
import { getDict } from "@/i18n/dictionaries";
import { localeFrom } from "./_guard";

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

/** Self-service organiser account: "Create your conference". */
export async function signup(_prev: ActionState, form: FormData): Promise<ActionState> {
  const locale = localeFrom(form);
  const dict = getDict(locale);
  const name = str(form, "name", 120);
  const organization = str(form, "organization", 200);
  const email = str(form, "email", 200).toLowerCase();
  const password = str(form, "password", 200);
  const confirm = str(form, "confirm", 200);
  const errors: Record<string, string> = {};
  if (!name) errors.name = dict.common.required;
  if (!isValidEmail(email)) errors.email = dict.common.invalidEmail;
  if (password.length < 8) errors.password = dict.signup.passwordHelp;
  if (password !== confirm) errors.confirm = dict.signup.mismatch;
  if (Object.keys(errors).length) return { ok: false, errors };

  const existing = await db.select({ id: users.id }).from(users).where(eq(users.email, email)).limit(1);
  if (existing.length) return { ok: false, errors: { email: dict.signup.exists } };

  const inserted = await db
    .insert(users)
    .values({ name, email, organization, passwordHash: await hashPassword(password), role: "organizer" })
    .returning({ id: users.id });
  await createSessionCookie({ id: inserted[0].id, name, email, role: "organizer" });
  redirect(`/${locale}/admin/conferences/new`);
}

export async function logout(form: FormData) {
  const locale = isLocale(str(form, "locale")) ? str(form, "locale") : defaultLocale;
  await clearSessionCookie();
  redirect(`/${locale}`);
}
