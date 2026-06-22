ALTER TABLE "accommodations" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "water_sources" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
DROP TABLE "accommodations" CASCADE;--> statement-breakpoint
DROP TABLE "water_sources" CASCADE;--> statement-breakpoint
ALTER TABLE "stages" DROP CONSTRAINT IF EXISTS "stages_overnight_accommodation_id_accommodations_id_fk";
--> statement-breakpoint
ALTER TABLE "stages" ADD CONSTRAINT "stages_overnight_accommodation_id_pois_id_fk" FOREIGN KEY ("overnight_accommodation_id") REFERENCES "public"."pois"("id") ON DELETE no action ON UPDATE no action;