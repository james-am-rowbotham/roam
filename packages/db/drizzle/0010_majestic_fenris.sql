CREATE TABLE "regions" (
	"id" serial PRIMARY KEY NOT NULL,
	"route_id" integer NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"image_url" text,
	"order_index" integer NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "journeys" ADD COLUMN "pace" text;--> statement-breakpoint
ALTER TABLE "sections" ADD COLUMN "region_id" integer;--> statement-breakpoint
ALTER TABLE "stages" ADD COLUMN "elapsed_seconds" integer;--> statement-breakpoint
ALTER TABLE "regions" ADD CONSTRAINT "regions_route_id_routes_id_fk" FOREIGN KEY ("route_id") REFERENCES "public"."routes"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sections" ADD CONSTRAINT "sections_region_id_regions_id_fk" FOREIGN KEY ("region_id") REFERENCES "public"."regions"("id") ON DELETE no action ON UPDATE no action;