CREATE TABLE `details` (
	`tid` text NOT NULL,
	`pid` text NOT NULL,
	`revision` text NOT NULL,
	`payload` text NOT NULL,
	PRIMARY KEY(`tid`, `pid`, `revision`)
);
--> statement-breakpoint
CREATE TABLE `locks` (
	`key` text PRIMARY KEY NOT NULL,
	`until` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `logs` (
	`id` text PRIMARY KEY NOT NULL,
	`created` text NOT NULL,
	`ok` integer NOT NULL,
	`message` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_logs_created` ON `logs` (`created`);--> statement-breakpoint
CREATE TABLE `previews` (
	`token` text PRIMARY KEY NOT NULL,
	`owner` text NOT NULL,
	`payload` text NOT NULL,
	`expires` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `settings` (
	`key` text PRIMARY KEY NOT NULL,
	`value` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `tournaments` (
	`id` text PRIMARY KEY NOT NULL,
	`payload` text NOT NULL,
	`published` integer DEFAULT 0 NOT NULL,
	`updated` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_tournaments_published` ON `tournaments` (`published`);