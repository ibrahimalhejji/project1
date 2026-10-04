ALTER TABLE `conferences` ADD `owner_id` integer REFERENCES users(id);--> statement-breakpoint
ALTER TABLE `messages` ADD `category` text DEFAULT 'contact' NOT NULL;--> statement-breakpoint
ALTER TABLE `users` ADD `organization` text DEFAULT '' NOT NULL;