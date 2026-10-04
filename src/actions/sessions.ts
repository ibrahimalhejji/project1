"use server";

import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { sessionSpeakers, sessions, SESSION_TYPES, tracks } from "@/db/schema";
import { int, list, oneOf, str, type ActionState } from "@/lib/form";
import { getDict } from "@/i18n/dictionaries";
import { assertConference, assertOwned, localeFrom, requireManager, revalidateAll } from "./_guard";

export async function saveSession(_prev: ActionState, form: FormData): Promise<ActionState> {
  const user = await requireManager();
  const locale = localeFrom(form);
  const dict = getDict(locale);
  const id = int(form, "id");
  const conferenceId = int(form, "conferenceId");
  const titleEn = str(form, "titleEn", 300);
  const titleAr = str(form, "titleAr", 300);
  const day = str(form, "day", 10);
  const startTime = str(form, "startTime", 5);
  const endTime = str(form, "endTime", 5);
  const errors: Record<string, string> = {};
  if (!conferenceId) return { ok: false, message: dict.common.error };
  await assertConference(user, conferenceId);
  if (id && (await assertOwned(user, "sessions", id)) !== conferenceId) return { ok: false, message: dict.common.error };
  if (!titleEn) errors.titleEn = dict.common.required;
  if (!titleAr) errors.titleAr = dict.common.required;
  if (!day) errors.day = dict.common.required;
  if (!startTime) errors.startTime = dict.common.required;
  if (!endTime) errors.endTime = dict.common.required;
  if (Object.keys(errors).length) return { ok: false, errors };

  const trackId = int(form, "trackId") || null;
  const values = {
    conferenceId,
    trackId,
    titleAr,
    titleEn,
    abstractAr: str(form, "abstractAr", 10000),
    abstractEn: str(form, "abstractEn", 10000),
    room: str(form, "room", 100),
    day,
    startTime,
    endTime: endTime < startTime ? startTime : endTime,
    type: oneOf(form, "type", SESSION_TYPES, "talk"),
    sortOrder: int(form, "sortOrder"),
  };
  const speakerIds = list(form, "speakerIds");

  let sessionId = id;
  if (id) {
    await db.update(sessions).set(values).where(eq(sessions.id, id));
    await db.delete(sessionSpeakers).where(eq(sessionSpeakers.sessionId, id));
  } else {
    const inserted = await db.insert(sessions).values(values).returning({ id: sessions.id });
    sessionId = inserted[0].id;
  }
  if (speakerIds.length) {
    await db.insert(sessionSpeakers).values(speakerIds.map((speakerId) => ({ sessionId, speakerId })));
  }
  revalidateAll();
  redirect(`/${locale}/admin/conferences/${conferenceId}/sessions`);
}

export async function deleteSession(form: FormData) {
  const user = await requireManager();
  const id = int(form, "id");
  if (id) {
    await assertOwned(user, "sessions", id);
    await db.delete(sessions).where(eq(sessions.id, id));
  }
  revalidateAll();
}

export async function saveTrack(form: FormData) {
  const user = await requireManager();
  const conferenceId = int(form, "conferenceId");
  const nameEn = str(form, "nameEn", 100);
  const nameAr = str(form, "nameAr", 100);
  if (!conferenceId || (!nameEn && !nameAr)) return;
  await assertConference(user, conferenceId);
  await db.insert(tracks).values({ conferenceId, nameEn: nameEn || nameAr, nameAr: nameAr || nameEn, color: str(form, "color", 7) || "#2a807a" });
  revalidateAll();
}

export async function deleteTrack(form: FormData) {
  const user = await requireManager();
  const id = int(form, "id");
  if (id) {
    await assertOwned(user, "tracks", id);
    await db.delete(tracks).where(eq(tracks.id, id));
  }
  revalidateAll();
}
