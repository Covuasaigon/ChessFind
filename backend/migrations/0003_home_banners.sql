CREATE TABLE IF NOT EXISTS `home_banners` (
	`id` text PRIMARY KEY NOT NULL,
	`title` text NOT NULL,
	`description` text,
	`image_url` text,
	`button_text` text,
	`button_link` text,
	`is_active` integer DEFAULT 1 NOT NULL,
	`sort_order` integer DEFAULT 0 NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
);

INSERT OR IGNORE INTO `home_banners` (`id`, `title`, `description`, `image_url`, `button_text`, `button_link`, `is_active`, `sort_order`, `created_at`, `updated_at`)
VALUES 
('b1', 'Giải đấu mới đã cập nhật', 'Tra cứu thành tích và hành trình thi đấu của các kỳ thủ', '/company-logo.png', 'Xem kết quả', '/?view=tournaments', 1, 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
('b2', 'Học Thể Thao Trí Tuệ Cờ Vua', 'Ươm mầm tài năng và rèn luyện tư duy logic cho học sinh', '/company-logo.png', 'Tìm hiểu thêm', '/?view=search', 1, 2, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);
