"use server";

import { eq } from "drizzle-orm";
import { db } from "@/db";
import { messages } from "@/db/schema";
import { int, oneOf, str, type ActionState } from "@/lib/form";
import { MESSAGE_CATEGORIES } from "@/lib/constants";
import { isValidEmail } from "@/lib/utils";
import { getDict } from "@/i18n/dictionaries";
import { localeFrom, requireAdminAction, revalidateAll } from "./_guard";

export async function sendMessage(_prev: ActionState, form: FormData): Promise<ActionState> {
  const locale = localeFrom(form);
  const dict = getDict(locale);
  const name = str(form, "name", 200);
  const email = str(form, "email", 200).toLowerCase();
  const body = str(form, "body", 5000);
  const category = oneOf(form, "category", MESSAGE_CATEGORIES, "contact");
  const errors: Record<string, string> = {};
  if (!name) errors.name = dict.common.required;
  if (!isValidEmail(email)) errors.email = dict.common.invalidEmail;
  if (!body) errors.body = dict.common.required;
  if (Object.keys(errors).length) return { ok: false, errors };
  await db.insert(messages).values({ name, email, subject: str(form, "subject", 300), body, category });
  revalidateAll();
  return { ok: true, message: category === "support" ? dict.support.success : dict.contact.success };
}

export async function markMessageRead(form: FormData) {
  await requireAdminAction();
  const id = int(form, "id");
  if (id) await db.update(messages).set({ isRead: true }).where(eq(messages.id, id));
  revalidateAll();
}

export async function deleteMessage(form: FormData) {
  await requireAdminAction();
  const id = int(form, "id");
  if (id) await db.delete(messages).where(eq(messages.id, id));
  revalidateAll();
}
