"use server";

import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { sponsors, SPONSOR_TIERS } from "@/db/schema";
import { int, oneOf, str, type ActionState } from "@/lib/form";
import { getDict } from "@/i18n/dictionaries";
import { assertConference, assertOwned, localeFrom, requireManager, revalidateAll } from "./_guard";

export async function saveSponsor(_prev: ActionState, form: FormData): Promise<ActionState> {
  const user = await requireManager();
  const locale = localeFrom(form);
  const dict = getDict(locale);
  const id = int(form, "id");
  const conferenceId = int(form, "conferenceId");
  const name = str(form, "name", 200);
  if (!conferenceId) return { ok: false, message: dict.common.error };
  await assertConference(user, conferenceId);
  if (id && (await assertOwned(user, "sponsors", id)) !== conferenceId) return { ok: false, message: dict.common.error };
  if (!name) return { ok: false, errors: { name: dict.common.required } };
  const values = {
    conferenceId,
    name,
    tier: oneOf(form, "tier", SPONSOR_TIERS, "partner"),
    logoUrl: str(form, "logoUrl", 500),
    website: str(form, "website", 300),
    sortOrder: int(form, "sortOrder"),
  };
  if (id) await db.update(sponsors).set(values).where(eq(sponsors.id, id));
  else await db.insert(sponsors).values(values);
  revalidateAll();
  redirect(`/${locale}/admin/conferences/${conferenceId}/sponsors`);
}

export async function deleteSponsor(form: FormData) {
  const user = await requireManager();
  const id = int(form, "id");
  if (id) {
    await assertOwned(user, "sponsors", id);
    await db.delete(sponsors).where(eq(sponsors.id, id));
  }
  revalidateAll();
}
