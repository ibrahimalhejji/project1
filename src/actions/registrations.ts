"use server";

import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { registrations, REGISTRATION_STATUSES, TICKET_TYPES } from "@/db/schema";
import { countActiveRegistrations, getConferenceById } from "@/db/queries";
import { int, oneOf, str, type ActionState } from "@/lib/form";
import { generateCode } from "@/lib/codes";
import { isValidEmail } from "@/lib/utils";
import { getDict } from "@/i18n/dictionaries";
import { assertOwned, localeFrom, requireManager, revalidateAll } from "./_guard";

export async function registerAttendee(_prev: ActionState, form: FormData): Promise<ActionState> {
  const locale = localeFrom(form);
  const dict = getDict(locale);
  const conferenceId = int(form, "conferenceId");
  const fullName = str(form, "fullName", 200);
  const email = str(form, "email", 200).toLowerCase();
  const errors: Record<string, string> = {};
  if (!fullName) errors.fullName = dict.common.required;
  if (!isValidEmail(email)) errors.email = dict.common.invalidEmail;
  if (Object.keys(errors).length) return { ok: false, errors };

  const conference = await getConferenceById(conferenceId);
  if (!conference || conference.status !== "published" || !conference.registrationOpen) {
    return { ok: false, message: dict.register.closed };
  }
  if (conference.capacity > 0 && (await countActiveRegistrations(conferenceId)) >= conference.capacity) {
    return { ok: false, message: dict.register.full };
  }
  const duplicate = await db
    .select({ id: registrations.id })
    .from(registrations)
    .where(and(eq(registrations.conferenceId, conferenceId), eq(registrations.email, email)))
    .limit(1);
  if (duplicate.length) return { ok: false, message: dict.register.duplicate };

  const code = generateCode("REG");
  await db.insert(registrations).values({
    conferenceId,
    code,
    fullName,
    email,
    phone: str(form, "phone", 50),
    organization: str(form, "organization", 200),
    jobTitle: str(form, "jobTitle", 200),
    ticketType: oneOf(form, "ticketType", TICKET_TYPES, "standard"),
    notes: str(form, "notes", 2000),
  });
  revalidateAll();
  return { ok: true, code, message: dict.register.success };
}

export async function updateRegistrationStatus(form: FormData) {
  const user = await requireManager();
  const id = int(form, "id");
  const status = oneOf(form, "status", REGISTRATION_STATUSES, "pending");
  if (id) {
    await assertOwned(user, "registrations", id);
    await db.update(registrations).set({ status }).where(eq(registrations.id, id));
  }
  revalidateAll();
}

export async function deleteRegistration(form: FormData) {
  const user = await requireManager();
  const id = int(form, "id");
  if (id) {
    await assertOwned(user, "registrations", id);
    await db.delete(registrations).where(eq(registrations.id, id));
  }
  revalidateAll();
}
