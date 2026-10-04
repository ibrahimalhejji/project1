// Shared enum values (safe to import from client components; no database code here).
export const USER_ROLES = ["admin", "organizer", "attendee"] as const;
export const CONFERENCE_STATUSES = ["draft", "published", "archived"] as const;
export const SESSION_TYPES = ["keynote", "talk", "workshop", "panel", "break", "other"] as const;
export const TICKET_TYPES = ["standard", "student", "speaker", "vip"] as const;
export const REGISTRATION_STATUSES = ["pending", "confirmed", "cancelled", "attended"] as const;
export const ABSTRACT_STATUSES = ["submitted", "under_review", "accepted", "rejected"] as const;
export const SPONSOR_TIERS = ["platinum", "gold", "silver", "bronze", "partner", "media"] as const;
