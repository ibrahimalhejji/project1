"use server";

import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { conferences, CONFERENCE_STATUSES } from "@/db/schema";
import { bool, int, num, oneOf, str, type ActionState } from "@/lib/form";
import { slugify } from "@/lib/utils";
import { getDict } from "@/i18n/dictionaries";
import { assertConference, localeFrom, requireManager, revalidateAll } from "./_guard";

export async function saveConference(_prev: ActionState, form: FormData): Promise<ActionState> {
  const user = await requireManager();
  const locale = localeFrom(form);
  const dict = getDict(locale);
  const id = int(form, "id");
  if (id) await assertConference(user, id);
  const titleEn = str(form, "titleEn", 200);
  const titleAr = str(form, "titleAr", 200);
  const startDate = str(form, "startDate", 10);
  const endDate = str(form, "endDate", 10) || startDate;
  const errors: Record<string, string> = {};
  if (!titleEn) errors.titleEn = dict.common.required;
  if (!titleAr) errors.titleAr = dict.common.required;
  if (!startDate) errors.startDate = dict.common.required;
  if (Object.keys(errors).length) return { ok: false, errors };

  let slug = slugify(str(form, "slug", 80)) || slugify(titleEn) || `conference-${Date.now()}`;
  const clash = await db.select({ id: conferences.id }).from(conferences).where(eq(conferences.slug, slug)).limit(1);
  if (clash[0] && clash[0].id !== id) slug = `${slug}-${Date.now().toString(36)}`;

  const values = {
    slug,
    titleAr,
    titleEn,
    taglineAr: str(form, "taglineAr", 300),
    taglineEn: str(form, "taglineEn", 300),
    descriptionAr: str(form, "descriptionAr", 20000),
    descriptionEn: str(form, "descriptionEn", 20000),
    startDate,
    endDate: endDate < startDate ? startDate : endDate,
    venueAr: str(form, "venueAr", 300),
    venueEn: str(form, "venueEn", 300),
    city: str(form, "city", 100),
    country: str(form, "country", 100),
    website: str(form, "website", 300),
    contactEmail: str(form, "contactEmail", 200),
    heroImage: str(form, "heroImage", 500),
    status: oneOf(form, "status", CONFERENCE_STATUSES, "draft"),
    registrationOpen: bool(form, "registrationOpen"),
    abstractsOpen: bool(form, "abstractsOpen"),
    abstractDeadline: str(form, "abstractDeadline", 10),
    capacity: Math.max(0, int(form, "capacity")),
    price: Math.max(0, num(form, "price")),
    currency: (str(form, "currency", 3) || "SAR").toUpperCase(),
    updatedAt: new Date().toISOString().slice(0, 19).replace("T", " "),
  };

  // Ownership: organisers always own what they create; administrators may assign an owner.
  const requestedOwner = int(form, "ownerId");
  const ownerId = user.role === "admin" ? (form.has("ownerId") ? requestedOwner || null : undefined) : id ? undefined : user.id;

  let conferenceId = id;
  if (id) {
    await db.update(conferences).set(ownerId === undefined ? values : { ...values, ownerId }).where(eq(conferences.id, id));
  } else {
    const inserted = await db
      .insert(conferences)
      .values({ ...values, ownerId: ownerId === undefined ? user.id : ownerId })
      .returning({ id: conferences.id });
    conferenceId = inserted[0].id;
  }
  revalidateAll();
  redirect(`/${locale}/admin/conferences/${conferenceId}`);
}

export async function setConferenceStatus(form: FormData) {
  const user = await requireManager();
  const id = int(form, "id");
  if (id) await assertConference(user, id);
  const status = oneOf(form, "status", CONFERENCE_STATUSES, "draft");
  if (id) await db.update(conferences).set({ status }).where(eq(conferences.id, id));
  revalidateAll();
}

export async function deleteConference(form: FormData) {
  const user = await requireManager();
  const locale = localeFrom(form);
  const id = int(form, "id");
  if (id) await assertConference(user, id);
  if (id) await db.delete(conferences).where(eq(conferences.id, id));
  revalidateAll();
  redirect(`/${locale}/admin/conferences`);
}
