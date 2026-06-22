ALTER TABLE "content_blocks" ADD COLUMN "block" jsonb NOT NULL;--> statement-breakpoint
ALTER TABLE "content_blocks" ADD COLUMN "schema_version" integer DEFAULT 1 NOT NULL;--> statement-breakpoint
ALTER TABLE "content_blocks" DROP COLUMN "block_type";--> statement-breakpoint
ALTER TABLE "content_blocks" DROP COLUMN "title";--> statement-breakpoint
ALTER TABLE "content_blocks" DROP COLUMN "body";