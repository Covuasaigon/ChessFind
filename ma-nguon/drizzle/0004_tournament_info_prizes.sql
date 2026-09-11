-- Migration 0004: Tournament Info & Prize Structures Support
-- Extended tournament payload metadata in tournaments table and helper tables

CREATE TABLE IF NOT EXISTS `tournament_details_info` (
	`tournament_id` text PRIMARY KEY NOT NULL,
	`intro` text,
	`regulations` text,
	`instructions` text,
	`location` text,
	`time` text,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`tournament_id`) REFERENCES `tournaments`(`id`) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS `prize_structures` (
	`id` text PRIMARY KEY NOT NULL,
	`tournament_id` text NOT NULL,
	`group_name` text NOT NULL,
	`rank` integer NOT NULL,
	`prize_name` text NOT NULL,
	`medal` text,
	`created_at` text NOT NULL,
	FOREIGN KEY (`tournament_id`) REFERENCES `tournaments`(`id`) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS `idx_prize_structures_tournament` ON `prize_structures` (`tournament_id`);
