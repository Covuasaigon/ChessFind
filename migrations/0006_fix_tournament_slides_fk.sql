PRAGMA foreign_keys=OFF;
CREATE TABLE IF NOT EXISTS `tournament_slides_fix` (
	`id` text PRIMARY KEY NOT NULL,
	`tournament_id` text,
	`title` text NOT NULL,
	`slide_type` text NOT NULL,
	`image_url` text NOT NULL,
	`display_order` integer DEFAULT 0 NOT NULL,
	`status` text DEFAULT 'active' NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
);
INSERT OR IGNORE INTO `tournament_slides_fix` SELECT `id`, `tournament_id`, `title`, `slide_type`, `image_url`, `display_order`, `status`, `created_at`, `updated_at` FROM `tournament_slides`;
DROP TABLE IF EXISTS `tournament_slides`;
ALTER TABLE `tournament_slides_fix` RENAME TO `tournament_slides`;
CREATE INDEX IF NOT EXISTS `idx_tournament_slides_tournament` ON `tournament_slides` (`tournament_id`);
PRAGMA foreign_keys=ON;
