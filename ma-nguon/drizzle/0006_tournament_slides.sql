CREATE TABLE IF NOT EXISTS `tournament_slides` (
	`id` text PRIMARY KEY NOT NULL,
	`tournament_id` text NOT NULL,
	`title` text NOT NULL,
	`slide_type` text NOT NULL,
	`image_url` text NOT NULL,
	`display_order` integer DEFAULT 0 NOT NULL,
	`status` text DEFAULT 'active' NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`tournament_id`) REFERENCES `tournaments`(`id`) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS `idx_tournament_slides_tournament` ON `tournament_slides` (`tournament_id`);
