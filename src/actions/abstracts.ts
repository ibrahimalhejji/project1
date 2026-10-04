"use server";

import { eq } from "drizzle-orm";
import { db } from "@/db";
import { abstracts, ABSTRACT_STATUSES } from "@/db/schema";
import { getConferenceById } from "@/db/queries";
import { int, oneOf, str, type ActionState } from "@/lib/form";
import { generateCode } from "@/lib/codes";
import { isValidEmail } from "@/lib/utils";
import { getDict } from "@/i18n/dictionaries";
import { assertOwned, localeFrom, requireManager, revalidateAll } from "./_guard";

export async function submitAbstract(_prev: ActionState, form: FormData): Promise<ActionState> {
  const locale = localeFrom(form);
  const dict = getDict(locale);
  const conferenceId = int(form, "conferenceId");
  const title = str(form, "title", 300);
  const authors = str(form, "authors", 500);
  const email = str(form, "email", 200).toLowerCase();
  const body = str(form, "body", 3000);
  const errors: Record<string, string> = {};
  if (!title) errors.title = dict.common.required;
  if (!authors) errors.authors = dict.common.required;
  if (!isValidEmail(email)) errors.email = dict.common.invalidEmail;
  if (body.length < 100) errors.body = dict.abstract.bodyHelp;
  if (Object.keys(errors).length) return { ok: false, errors };

  const conference = await getConferenceById(conferenceId);
  const today = new Date().toISOString().slice(0, 10);
  const pastDeadline = !!conference?.abstractDeadline && conference.abstractDeadline < today;
  if (!conference || conference.status !== "published" || !conference.abstractsOpen || pastDeadline) {
    return { ok: false, message: dict.abstract.closed };
  }
  const code = generateCode("ABS");
  await db.insert(abstracts).values({
    conferenceId,
    code,
    title,
    authors,
    email,
    affiliation: str(form, "affiliation", 300),
    topic: str(form, "topic", 200),
    keywords: str(form, "keywords", 300),
    body,
  });
  revalidateAll();
  return { ok: true, code, message: dict.abstract.success };
}

export async function reviewAbstract(form: FormData) {
  const user = await requireManager();
  const id = int(form, "id");
  const status = oneOf(form, "status", ABSTRACT_STATUSES, "submitted");
  const reviewerNotes = str(form, "reviewerNotes", 5000);
  if (id) {
    await assertOwned(user, "abstracts", id);
    await db.update(abstracts).set({ status, reviewerNotes }).where(eq(abstracts.id, id));
  }
  revalidateAll();
}

export async function deleteAbstract(form: FormData) {
  const user = await requireManager();
  const id = int(form, "id");
  if (id) {
    await assertOwned(user, "abstracts", id);
    await db.delete(abstracts).where(eq(abstracts.id, id));
  }
  revalidateAll();
}
