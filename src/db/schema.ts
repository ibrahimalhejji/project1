import { sql } from "drizzle-orm";
import { integer, primaryKey, real, sqliteTable, text } from "drizzle-orm/sqlite-core";

const timestamps = {
  createdAt: text("created_at")
    .notNull()
    .default(sql`(datetime('now'))`),
  updatedAt: text("updated_at")
    .notNull()
    .default(sql`(datetime('now'))`),
};

import {
  ABSTRACT_STATUSES,
  CONFERENCE_STATUSES,
  REGISTRATION_STATUSES,
  SESSION_TYPES,
  SPONSOR_TIERS,
  TICKET_TYPES,
  USER_ROLES,
} from "@/lib/constants";

export { ABSTRACT_STATUSES, CONFERENCE_STATUSES, REGISTRATION_STATUSES, SESSION_TYPES, SPONSOR_TIERS, TICKET_TYPES, USER_ROLES };

export const users = sqliteTable("users", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  role: text("role", { enum: USER_ROLES }).notNull().default("attendee"),
  ...timestamps,
});

export const conferences = sqliteTable("conferences", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  slug: text("slug").notNull().unique(),
  titleAr: text("title_ar").notNull(),
  titleEn: text("title_en").notNull(),
  taglineAr: text("tagline_ar").notNull().default(""),
  taglineEn: text("tagline_en").notNull().default(""),
  descriptionAr: text("description_ar").notNull().default(""),
  descriptionEn: text("description_en").notNull().default(""),
  startDate: text("start_date").notNull(), // ISO date YYYY-MM-DD
  endDate: text("end_date").notNull(),
  venueAr: text("venue_ar").notNull().default(""),
  venueEn: text("venue_en").notNull().default(""),
  city: text("city").notNull().default(""),
  country: text("country").notNull().default(""),
  website: text("website").notNull().default(""),
  contactEmail: text("contact_email").notNull().default(""),
  heroImage: text("hero_image").notNull().default(""),
  status: text("status", { enum: CONFERENCE_STATUSES }).notNull().default("draft"),
  registrationOpen: integer("registration_open", { mode: "boolean" }).notNull().default(false),
  abstractsOpen: integer("abstracts_open", { mode: "boolean" }).notNull().default(false),
  abstractDeadline: text("abstract_deadline").notNull().default(""),
  capacity: integer("capacity").notNull().default(0),
  price: real("price").notNull().default(0),
  currency: text("currency").notNull().default("SAR"),
  ...timestamps,
});

export const tracks = sqliteTable("tracks", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  conferenceId: integer("conference_id")
    .notNull()
    .references(() => conferences.id, { onDelete: "cascade" }),
  nameAr: text("name_ar").notNull(),
  nameEn: text("name_en").notNull(),
  color: text("color").notNull().default("#2a807a"),
});

export const sessions = sqliteTable("sessions", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  conferenceId: integer("conference_id")
    .notNull()
    .references(() => conferences.id, { onDelete: "cascade" }),
  trackId: integer("track_id").references(() => tracks.id, { onDelete: "set null" }),
  titleAr: text("title_ar").notNull(),
  titleEn: text("title_en").notNull(),
  abstractAr: text("abstract_ar").notNull().default(""),
  abstractEn: text("abstract_en").notNull().default(""),
  room: text("room").notNull().default(""),
  day: text("day").notNull(), // YYYY-MM-DD
  startTime: text("start_time").notNull(), // HH:MM
  endTime: text("end_time").notNull(),
  type: text("type", { enum: SESSION_TYPES }).notNull().default("talk"),
  sortOrder: integer("sort_order").notNull().default(0),
  ...timestamps,
});

export const speakers = sqliteTable("speakers", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  conferenceId: integer("conference_id")
    .notNull()
    .references(() => conferences.id, { onDelete: "cascade" }),
  nameAr: text("name_ar").notNull(),
  nameEn: text("name_en").notNull(),
  jobTitleAr: text("job_title_ar").notNull().default(""),
  jobTitleEn: text("job_title_en").notNull().default(""),
  organization: text("organization").notNull().default(""),
  bioAr: text("bio_ar").notNull().default(""),
  bioEn: text("bio_en").notNull().default(""),
  photoUrl: text("photo_url").notNull().default(""),
  email: text("email").notNull().default(""),
  website: text("website").notNull().default(""),
  linkedin: text("linkedin").notNull().default(""),
  twitter: text("twitter").notNull().default(""),
  isKeynote: integer("is_keynote", { mode: "boolean" }).notNull().default(false),
  sortOrder: integer("sort_order").notNull().default(0),
  ...timestamps,
});

export const sessionSpeakers = sqliteTable(
  "session_speakers",
  {
    sessionId: integer("session_id")
      .notNull()
      .references(() => sessions.id, { onDelete: "cascade" }),
    speakerId: integer("speaker_id")
      .notNull()
      .references(() => speakers.id, { onDelete: "cascade" }),
  },
  (table) => [primaryKey({ columns: [table.sessionId, table.speakerId] })],
);

export const registrations = sqliteTable("registrations", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  conferenceId: integer("conference_id")
    .notNull()
    .references(() => conferences.id, { onDelete: "cascade" }),
  code: text("code").notNull().unique(),
  fullName: text("full_name").notNull(),
  email: text("email").notNull(),
  phone: text("phone").notNull().default(""),
  organization: text("organization").notNull().default(""),
  jobTitle: text("job_title").notNull().default(""),
  ticketType: text("ticket_type", { enum: TICKET_TYPES }).notNull().default("standard"),
  status: text("status", { enum: REGISTRATION_STATUSES }).notNull().default("pending"),
  notes: text("notes").notNull().default(""),
  ...timestamps,
});

export const abstracts = sqliteTable("abstracts", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  conferenceId: integer("conference_id")
    .notNull()
    .references(() => conferences.id, { onDelete: "cascade" }),
  code: text("code").notNull().unique(),
  title: text("title").notNull(),
  authors: text("authors").notNull(),
  email: text("email").notNull(),
  affiliation: text("affiliation").notNull().default(""),
  topic: text("topic").notNull().default(""),
  keywords: text("keywords").notNull().default(""),
  body: text("body").notNull(),
  status: text("status", { enum: ABSTRACT_STATUSES }).notNull().default("submitted"),
  reviewerNotes: text("reviewer_notes").notNull().default(""),
  ...timestamps,
});

export const sponsors = sqliteTable("sponsors", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  conferenceId: integer("conference_id")
    .notNull()
    .references(() => conferences.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  tier: text("tier", { enum: SPONSOR_TIERS }).notNull().default("partner"),
  logoUrl: text("logo_url").notNull().default(""),
  website: text("website").notNull().default(""),
  sortOrder: integer("sort_order").notNull().default(0),
  ...timestamps,
});

export const messages = sqliteTable("messages", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull(),
  email: text("email").notNull(),
  subject: text("subject").notNull().default(""),
  body: text("body").notNull(),
  isRead: integer("is_read", { mode: "boolean" }).notNull().default(false),
  ...timestamps,
});

export type User = typeof users.$inferSelect;
export type Conference = typeof conferences.$inferSelect;
export type NewConference = typeof conferences.$inferInsert;
export type Track = typeof tracks.$inferSelect;
export type Session = typeof sessions.$inferSelect;
export type NewSession = typeof sessions.$inferInsert;
export type Speaker = typeof speakers.$inferSelect;
export type NewSpeaker = typeof speakers.$inferInsert;
export type Registration = typeof registrations.$inferSelect;
export type Abstract = typeof abstracts.$inferSelect;
export type Sponsor = typeof sponsors.$inferSelect;
export type NewSponsor = typeof sponsors.$inferInsert;
export type Message = typeof messages.$inferSelect;
