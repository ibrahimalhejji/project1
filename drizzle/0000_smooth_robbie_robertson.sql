CREATE TABLE `abstracts` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`conference_id` integer NOT NULL,
	`code` text NOT NULL,
	`title` text NOT NULL,
	`authors` text NOT NULL,
	`email` text NOT NULL,
	`affiliation` text DEFAULT '' NOT NULL,
	`topic` text DEFAULT '' NOT NULL,
	`keywords` text DEFAULT '' NOT NULL,
	`body` text NOT NULL,
	`status` text DEFAULT 'submitted' NOT NULL,
	`reviewer_notes` text DEFAULT '' NOT NULL,
	`created_at` text DEFAULT (datetime('now')) NOT NULL,
	`updated_at` text DEFAULT (datetime('now')) NOT NULL,
	FOREIGN KEY (`conference_id`) REFERENCES `conferences`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `abstracts_code_unique` ON `abstracts` (`code`);--> statement-breakpoint
CREATE TABLE `conferences` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`slug` text NOT NULL,
	`title_ar` text NOT NULL,
	`title_en` text NOT NULL,
	`tagline_ar` text DEFAULT '' NOT NULL,
	`tagline_en` text DEFAULT '' NOT NULL,
	`description_ar` text DEFAULT '' NOT NULL,
	`description_en` text DEFAULT '' NOT NULL,
	`start_date` text NOT NULL,
	`end_date` text NOT NULL,
	`venue_ar` text DEFAULT '' NOT NULL,
	`venue_en` text DEFAULT '' NOT NULL,
	`city` text DEFAULT '' NOT NULL,
	`country` text DEFAULT '' NOT NULL,
	`website` text DEFAULT '' NOT NULL,
	`contact_email` text DEFAULT '' NOT NULL,
	`hero_image` text DEFAULT '' NOT NULL,
	`status` text DEFAULT 'draft' NOT NULL,
	`registration_open` integer DEFAULT false NOT NULL,
	`abstracts_open` integer DEFAULT false NOT NULL,
	`abstract_deadline` text DEFAULT '' NOT NULL,
	`capacity` integer DEFAULT 0 NOT NULL,
	`price` real DEFAULT 0 NOT NULL,
	`currency` text DEFAULT 'SAR' NOT NULL,
	`created_at` text DEFAULT (datetime('now')) NOT NULL,
	`updated_at` text DEFAULT (datetime('now')) NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `conferences_slug_unique` ON `conferences` (`slug`);--> statement-breakpoint
CREATE TABLE `messages` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`email` text NOT NULL,
	`subject` text DEFAULT '' NOT NULL,
	`body` text NOT NULL,
	`is_read` integer DEFAULT false NOT NULL,
	`created_at` text DEFAULT (datetime('now')) NOT NULL,
	`updated_at` text DEFAULT (datetime('now')) NOT NULL
);
--> statement-breakpoint
CREATE TABLE `registrations` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`conference_id` integer NOT NULL,
	`code` text NOT NULL,
	`full_name` text NOT NULL,
	`email` text NOT NULL,
	`phone` text DEFAULT '' NOT NULL,
	`organization` text DEFAULT '' NOT NULL,
	`job_title` text DEFAULT '' NOT NULL,
	`ticket_type` text DEFAULT 'standard' NOT NULL,
	`status` text DEFAULT 'pending' NOT NULL,
	`notes` text DEFAULT '' NOT NULL,
	`created_at` text DEFAULT (datetime('now')) NOT NULL,
	`updated_at` text DEFAULT (datetime('now')) NOT NULL,
	FOREIGN KEY (`conference_id`) REFERENCES `conferences`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `registrations_code_unique` ON `registrations` (`code`);--> statement-breakpoint
CREATE TABLE `session_speakers` (
	`session_id` integer NOT NULL,
	`speaker_id` integer NOT NULL,
	PRIMARY KEY(`session_id`, `speaker_id`),
	FOREIGN KEY (`session_id`) REFERENCES `sessions`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`speaker_id`) REFERENCES `speakers`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `sessions` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`conference_id` integer NOT NULL,
	`track_id` integer,
	`title_ar` text NOT NULL,
	`title_en` text NOT NULL,
	`abstract_ar` text DEFAULT '' NOT NULL,
	`abstract_en` text DEFAULT '' NOT NULL,
	`room` text DEFAULT '' NOT NULL,
	`day` text NOT NULL,
	`start_time` text NOT NULL,
	`end_time` text NOT NULL,
	`type` text DEFAULT 'talk' NOT NULL,
	`sort_order` integer DEFAULT 0 NOT NULL,
	`created_at` text DEFAULT (datetime('now')) NOT NULL,
	`updated_at` text DEFAULT (datetime('now')) NOT NULL,
	FOREIGN KEY (`conference_id`) REFERENCES `conferences`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`track_id`) REFERENCES `tracks`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE TABLE `speakers` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`conference_id` integer NOT NULL,
	`name_ar` text NOT NULL,
	`name_en` text NOT NULL,
	`job_title_ar` text DEFAULT '' NOT NULL,
	`job_title_en` text DEFAULT '' NOT NULL,
	`organization` text DEFAULT '' NOT NULL,
	`bio_ar` text DEFAULT '' NOT NULL,
	`bio_en` text DEFAULT '' NOT NULL,
	`photo_url` text DEFAULT '' NOT NULL,
	`email` text DEFAULT '' NOT NULL,
	`website` text DEFAULT '' NOT NULL,
	`linkedin` text DEFAULT '' NOT NULL,
	`twitter` text DEFAULT '' NOT NULL,
	`is_keynote` integer DEFAULT false NOT NULL,
	`sort_order` integer DEFAULT 0 NOT NULL,
	`created_at` text DEFAULT (datetime('now')) NOT NULL,
	`updated_at` text DEFAULT (datetime('now')) NOT NULL,
	FOREIGN KEY (`conference_id`) REFERENCES `conferences`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `sponsors` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`conference_id` integer NOT NULL,
	`name` text NOT NULL,
	`tier` text DEFAULT 'partner' NOT NULL,
	`logo_url` text DEFAULT '' NOT NULL,
	`website` text DEFAULT '' NOT NULL,
	`sort_order` integer DEFAULT 0 NOT NULL,
	`created_at` text DEFAULT (datetime('now')) NOT NULL,
	`updated_at` text DEFAULT (datetime('now')) NOT NULL,
	FOREIGN KEY (`conference_id`) REFERENCES `conferences`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `tracks` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`conference_id` integer NOT NULL,
	`name_ar` text NOT NULL,
	`name_en` text NOT NULL,
	`color` text DEFAULT '#2a807a' NOT NULL,
	FOREIGN KEY (`conference_id`) REFERENCES `conferences`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `users` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`email` text NOT NULL,
	`password_hash` text NOT NULL,
	`role` text DEFAULT 'attendee' NOT NULL,
	`created_at` text DEFAULT (datetime('now')) NOT NULL,
	`updated_at` text DEFAULT (datetime('now')) NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `users_email_unique` ON `users` (`email`);