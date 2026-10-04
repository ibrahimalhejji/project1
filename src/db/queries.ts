import { and, asc, count, desc, eq, inArray, ne, sql } from "drizzle-orm";
import { db } from "./index";
import { abstracts, conferences, messages, registrations, sessionSpeakers, sessions, speakers, sponsors, tracks, type Session, type Speaker } from "./schema";

export type SessionWithSpeakers = Session & { speakers: Speaker[] };

export async function listPublishedConferences() {
  return db.select().from(conferences).where(eq(conferences.status, "published")).orderBy(asc(conferences.startDate));
}

export async function listAllConferences() {
  return db.select().from(conferences).orderBy(desc(conferences.startDate));
}

export async function getConferenceBySlug(slug: string, includeDrafts = false) {
  const rows = await db
    .select()
    .from(conferences)
    .where(includeDrafts ? eq(conferences.slug, slug) : and(eq(conferences.slug, slug), eq(conferences.status, "published")))
    .limit(1);
  return rows[0] ?? null;
}

export async function getConferenceById(id: number) {
  const rows = await db.select().from(conferences).where(eq(conferences.id, id)).limit(1);
  return rows[0] ?? null;
}

export async function getTracks(conferenceId: number) {
  return db.select().from(tracks).where(eq(tracks.conferenceId, conferenceId)).orderBy(asc(tracks.id));
}

export async function getSpeakers(conferenceId: number) {
  return db
    .select()
    .from(speakers)
    .where(eq(speakers.conferenceId, conferenceId))
    .orderBy(desc(speakers.isKeynote), asc(speakers.sortOrder), asc(speakers.nameEn));
}

export async function getSpeakerById(id: number) {
  const rows = await db.select().from(speakers).where(eq(speakers.id, id)).limit(1);
  return rows[0] ?? null;
}

export async function getSessionsWithSpeakers(conferenceId: number): Promise<SessionWithSpeakers[]> {
  const sessionRows = await db
    .select()
    .from(sessions)
    .where(eq(sessions.conferenceId, conferenceId))
    .orderBy(asc(sessions.day), asc(sessions.startTime), asc(sessions.sortOrder));
  if (sessionRows.length === 0) return [];
  const links = await db
    .select({ sessionId: sessionSpeakers.sessionId, speaker: speakers })
    .from(sessionSpeakers)
    .innerJoin(speakers, eq(speakers.id, sessionSpeakers.speakerId))
    .where(inArray(sessionSpeakers.sessionId, sessionRows.map((s) => s.id)));
  const bySession = new Map<number, Speaker[]>();
  for (const link of links) {
    const list = bySession.get(link.sessionId) ?? [];
    list.push(link.speaker);
    bySession.set(link.sessionId, list);
  }
  return sessionRows.map((s) => ({ ...s, speakers: bySession.get(s.id) ?? [] }));
}

export async function getSessionById(id: number) {
  const rows = await db.select().from(sessions).where(eq(sessions.id, id)).limit(1);
  const session = rows[0] ?? null;
  if (!session) return null;
  const links = await db.select({ speakerId: sessionSpeakers.speakerId }).from(sessionSpeakers).where(eq(sessionSpeakers.sessionId, id));
  return { ...session, speakerIds: links.map((l) => l.speakerId) };
}

export async function getSponsors(conferenceId: number) {
  return db.select().from(sponsors).where(eq(sponsors.conferenceId, conferenceId)).orderBy(asc(sponsors.sortOrder), asc(sponsors.name));
}

export async function getSponsorById(id: number) {
  const rows = await db.select().from(sponsors).where(eq(sponsors.id, id)).limit(1);
  return rows[0] ?? null;
}

export async function getRegistrations(conferenceId: number) {
  return db.select().from(registrations).where(eq(registrations.conferenceId, conferenceId)).orderBy(desc(registrations.createdAt));
}

export async function countActiveRegistrations(conferenceId: number) {
  const rows = await db
    .select({ value: count() })
    .from(registrations)
    .where(and(eq(registrations.conferenceId, conferenceId), ne(registrations.status, "cancelled")));
  return rows[0]?.value ?? 0;
}

export async function getAbstracts(conferenceId: number) {
  return db.select().from(abstracts).where(eq(abstracts.conferenceId, conferenceId)).orderBy(desc(abstracts.createdAt));
}

export async function getAbstractById(id: number) {
  const rows = await db.select().from(abstracts).where(eq(abstracts.id, id)).limit(1);
  return rows[0] ?? null;
}

export async function listMessages() {
  return db.select().from(messages).orderBy(desc(messages.createdAt));
}

export async function listPublishedSpeakers() {
  return db
    .select({ speaker: speakers, conference: conferences })
    .from(speakers)
    .innerJoin(conferences, eq(conferences.id, speakers.conferenceId))
    .where(eq(conferences.status, "published"))
    .orderBy(desc(speakers.isKeynote), asc(speakers.sortOrder), asc(speakers.nameEn));
}

export async function publicStats() {
  const [conf] = await db.select({ value: count() }).from(conferences).where(eq(conferences.status, "published"));
  const [spk] = await db
    .select({ value: count() })
    .from(speakers)
    .innerJoin(conferences, eq(conferences.id, speakers.conferenceId))
    .where(eq(conferences.status, "published"));
  const [reg] = await db.select({ value: count() }).from(registrations).where(ne(registrations.status, "cancelled"));
  return { conferences: conf?.value ?? 0, speakers: spk?.value ?? 0, registrations: reg?.value ?? 0 };
}

export async function dashboardStats() {
  const [total] = await db.select({ value: count() }).from(conferences);
  const [published] = await db.select({ value: count() }).from(conferences).where(eq(conferences.status, "published"));
  const [regs] = await db.select({ value: count() }).from(registrations).where(ne(registrations.status, "cancelled"));
  const [pendingAbs] = await db
    .select({ value: count() })
    .from(abstracts)
    .where(inArray(abstracts.status, ["submitted", "under_review"]));
  const [unread] = await db.select({ value: count() }).from(messages).where(eq(messages.isRead, false));
  const recentRegistrations = await db
    .select({ registration: registrations, conference: conferences })
    .from(registrations)
    .innerJoin(conferences, eq(conferences.id, registrations.conferenceId))
    .orderBy(desc(registrations.createdAt))
    .limit(8);
  const recentAbstracts = await db
    .select({ abstract: abstracts, conference: conferences })
    .from(abstracts)
    .innerJoin(conferences, eq(conferences.id, abstracts.conferenceId))
    .orderBy(desc(abstracts.createdAt))
    .limit(5);
  return {
    totalConferences: total?.value ?? 0,
    publishedConferences: published?.value ?? 0,
    totalRegistrations: regs?.value ?? 0,
    pendingAbstracts: pendingAbs?.value ?? 0,
    unreadMessages: unread?.value ?? 0,
    recentRegistrations,
    recentAbstracts,
  };
}

export type ConferenceCounts = { sessions: number; speakers: number; registrations: number; abstracts: number; sponsors: number };

export async function conferenceCounts(conferenceId: number): Promise<ConferenceCounts> {
  const [row] = await db
    .select({
      sessions: sql<number>`(select count(*) from sessions where conference_id = ${conferenceId})`,
      speakers: sql<number>`(select count(*) from speakers where conference_id = ${conferenceId})`,
      registrations: sql<number>`(select count(*) from registrations where conference_id = ${conferenceId} and status != 'cancelled')`,
      abstracts: sql<number>`(select count(*) from abstracts where conference_id = ${conferenceId})`,
      sponsors: sql<number>`(select count(*) from sponsors where conference_id = ${conferenceId})`,
    })
    .from(conferences)
    .where(eq(conferences.id, conferenceId));
  return {
    sessions: Number(row?.sessions ?? 0),
    speakers: Number(row?.speakers ?? 0),
    registrations: Number(row?.registrations ?? 0),
    abstracts: Number(row?.abstracts ?? 0),
    sponsors: Number(row?.sponsors ?? 0),
  };
}
