-- Migration: 0009_auto_sync_scheduler.sql
-- Description: Add auto_sync, sync_interval, last_sync, next_sync fields to tournaments table.

ALTER TABLE `tournaments` ADD COLUMN `auto_sync` integer DEFAULT 1 NOT NULL;
ALTER TABLE `tournaments` ADD COLUMN `sync_interval` integer DEFAULT 5 NOT NULL;
ALTER TABLE `tournaments` ADD COLUMN `last_sync` text;
ALTER TABLE `tournaments` ADD COLUMN `next_sync` text;
