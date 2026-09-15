-- Migration: 0007_refactor_single_source_of_truth.sql
-- Description: Create sync_logs table, index matches by player and round, and add tournament metadata fields.

CREATE TABLE IF NOT EXISTS `sync_logs` (
	`id` text PRIMARY KEY NOT NULL,
	`tournament_id` text,
	`tournament_name` text,
	`url` text NOT NULL,
	`created_at` text NOT NULL,
	`status` text NOT NULL,
	`players_updated` integer DEFAULT 0 NOT NULL,
	`message` text NOT NULL
);

CREATE INDEX IF NOT EXISTS `idx_sync_logs_created` ON `sync_logs` (`created_at`);
CREATE INDEX IF NOT EXISTS `idx_sync_logs_tournament` ON `sync_logs` (`tournament_id`);

CREATE UNIQUE INDEX IF NOT EXISTS `idx_matches_player_round` ON `matches` (`player_id`, `round`);
