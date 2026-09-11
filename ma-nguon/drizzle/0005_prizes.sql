CREATE TABLE IF NOT EXISTS `prizes` (
	`id` text PRIMARY KEY NOT NULL,
	`tournament_id` text NOT NULL,
	`group_name` text NOT NULL,
	`rank_from` integer NOT NULL,
	`rank_to` integer NOT NULL,
	`medal` text,
	`prize_name` text NOT NULL,
	`description` text,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`tournament_id`) REFERENCES `tournaments`(`id`) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS `idx_prizes_tournament` ON `prizes` (`tournament_id`);
