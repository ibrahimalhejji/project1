"use server";

import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { speakers } from "@/db/schema";
import { bool, int, str, type ActionState } from "@/lib/form";
import { getDict } from "@/i18n/dictionaries";
import { localeFrom, requireAdminAction, revalidateAll } from "./_guard";

export async function saveSpeaker(_prev: ActionState, form: FormData): Promise<ActionState> {
  await requireAdminAction();
  const locale = localeFrom(form);
  const dict = getDict(locale);
  const id = int(form, "id");
  const conferenceId = int(form, "conferenceId");
  const nameEn = str(form, "nameEn", 200);
  const nameAr = str(form, "nameAr", 200);
  const errors: Record<string, string> = {};
  if (!conferenceId) return { ok: false, message: dict.common.error };
  if (!nameEn) errors.nameEn = dict.common.required;
  if (!nameAr) errors.nameAr = dict.common.required;
  if (Object.keys(errors).length) return { ok: false, errors };

  const values = {
    conferenceId,
    nameAr,
    nameEn,
    jobTitleAr: str(form, "jobTitleAr", 200),
    jobTitleEn: str(form, "jobTitleEn", 200),
    organization: str(form, "organization", 200),
    bioAr: str(form, "bioAr", 10000),
    bioEn: str(form, "bioEn", 10000),
    photoUrl: str(form, "photoUrl", 500),
    email: str(form, "email", 200),
    website: str(form, "website", 300),
    linkedin: str(form, "linkedin", 300),
    twitter: str(form, "twitter", 300),
    isKeynote: bool(form, "isKeynote"),
    sortOrder: int(form, "sortOrder"),
  };
  if (id) await db.update(speakers).set(values).where(eq(speakers.id, id));
  else await db.insert(speakers).values(values);
  revalidateAll();
  redirect(`/${locale}/admin/conferences/${conferenceId}/speakers`);
}

export async function deleteSpeaker(form: FormData) {
  await requireAdminAction();
  const id = int(form, "id");
  if (id) await db.delete(speakers).where(eq(speakers.id, id));
  revalidateAll();
}
