CREATE TABLE "pois" (
	"id" serial PRIMARY KEY NOT NULL,
	"route_id" integer NOT NULL,
	"category" text NOT NULL,
	"name" text,
	"chainage_m" double precision NOT NULL,
	"geom" geometry(point),
	"meta" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"image_url" text,
	"source" text DEFAULT 'osm' NOT NULL,
	"confidence" double precision DEFAULT 0.5 NOT NULL,
	"last_confirmed_at" timestamp,
	"report_count" integer DEFAULT 0 NOT NULL,
	"manual_override" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "pois" ADD CONSTRAINT "pois_route_id_routes_id_fk" FOREIGN KEY ("route_id") REFERENCES "public"."routes"("id") ON DELETE no action ON UPDATE no action;