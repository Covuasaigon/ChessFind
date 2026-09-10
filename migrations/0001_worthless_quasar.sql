CREATE TABLE `auth_attempts` (
	`key` text PRIMARY KEY NOT NULL,
	`count` integer NOT NULL,
	`reset` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `admin_sessions` (
	`hash` text PRIMARY KEY NOT NULL,
	`csrf` text NOT NULL,
	`expires` integer NOT NULL
);
