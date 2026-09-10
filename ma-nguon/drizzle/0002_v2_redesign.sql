CREATE TABLE IF NOT EXISTS `categories` (
	`id` text PRIMARY KEY NOT NULL,
	`tournament_id` text NOT NULL,
	`name` text NOT NULL,
	`gender` text,
	`age_group` text,
	`source_url` text NOT NULL,
	`total_players` integer DEFAULT 0 NOT NULL,
	`rounds` integer,
	`updated` text NOT NULL,
	`payload` text,
	FOREIGN KEY (`tournament_id`) REFERENCES `tournaments`(`id`) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS `idx_categories_tournament` ON `categories` (`tournament_id`);

CREATE TABLE IF NOT EXISTS `players` (
	`id` text PRIMARY KEY NOT NULL,
	`category_id` text NOT NULL,
	`tournament_id` text NOT NULL,
	`snr` text NOT NULL,
	`name` text NOT NULL,
	`fide_id` text,
	`rating` integer,
	`club` text,
	`country` text,
	`gender` text,
	`age_group` text,
	`updated` text NOT NULL,
	FOREIGN KEY (`category_id`) REFERENCES `categories`(`id`) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS `idx_players_category` ON `players` (`category_id`);
CREATE INDEX IF NOT EXISTS `idx_players_tournament` ON `players` (`tournament_id`);
CREATE INDEX IF NOT EXISTS `idx_players_name` ON `players` (`name`);

CREATE TABLE IF NOT EXISTS `rankings` (
	`player_id` text PRIMARY KEY NOT NULL,
	`category_id` text NOT NULL,
	`rank` integer,
	`points` real,
	`buchholz` real,
	`sonneborn_berger` real,
	`performance` integer,
	`ties_json` text,
	FOREIGN KEY (`player_id`) REFERENCES `players`(`id`) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS `idx_rankings_category` ON `rankings` (`category_id`);

CREATE TABLE IF NOT EXISTS `matches` (
	`id` text PRIMARY KEY NOT NULL,
	`category_id` text NOT NULL,
	`player_id` text NOT NULL,
	`player_white` text,
	`player_black` text,
	`round` integer NOT NULL,
	`board` integer,
	`result` text,
	`score` real,
	`color` text,
	`opponent_id` text,
	`opponent_name` text,
	FOREIGN KEY (`player_id`) REFERENCES `players`(`id`) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS `idx_matches_player` ON `matches` (`player_id`);
