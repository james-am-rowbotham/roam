CREATE TABLE "accommodations" (
	"id" serial PRIMARY KEY NOT NULL,
	"route_id" integer NOT NULL,
	"name" text NOT NULL,
	"chainage_m" double precision NOT NULL,
	"geom" geometry(point),
	"type" text NOT NULL,
	"capacity" integer,
	"seasonal" boolean DEFAULT false NOT NULL,
	"booking_url" text,
	"source" text DEFAULT 'osm' NOT NULL,
	"confidence" double precision DEFAULT 0.5 NOT NULL,
	"last_confirmed_at" timestamp,
	"report_count" integer DEFAULT 0 NOT NULL,
	"manual_override" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "hazards" (
	"id" serial PRIMARY KEY NOT NULL,
	"route_id" integer NOT NULL,
	"name" text,
	"chainage_m" double precision NOT NULL,
	"geom" geometry(point),
	"type" text NOT NULL,
	"description" text,
	"source" text DEFAULT 'osm' NOT NULL,
	"confidence" double precision DEFAULT 0.5 NOT NULL,
	"last_confirmed_at" timestamp,
	"report_count" integer DEFAULT 0 NOT NULL,
	"manual_override" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "journeys" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"route_id" integer NOT NULL,
	"direction" text DEFAULT 'forward' NOT NULL,
	"start_date" timestamp,
	"end_date" timestamp,
	"status" text DEFAULT 'planned' NOT NULL,
	"accommodation" text,
	"start_chainage_m" double precision,
	"end_chainage_m" double precision,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "peak_routes" (
	"id" serial PRIMARY KEY NOT NULL,
	"peak_id" integer NOT NULL,
	"route_id" integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE "peaks" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"elevation_m" double precision,
	"geom" geometry(point),
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "photos" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"poi_id" integer NOT NULL,
	"report_id" integer,
	"storage_key" text NOT NULL,
	"width" integer,
	"height" integer,
	"taken_at" timestamp,
	"moderation" text DEFAULT 'pending' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "reports" (
	"id" serial PRIMARY KEY NOT NULL,
	"entity_type" text NOT NULL,
	"entity_id" integer NOT NULL,
	"user_id" text NOT NULL,
	"state" text NOT NULL,
	"note" text,
	"geom" geometry(point),
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "routes" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"distance_m" double precision,
	"ascent_m" double precision,
	"descent_m" double precision,
	"geom" geometry(point),
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sections" (
	"id" serial PRIMARY KEY NOT NULL,
	"route_id" integer NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"order_index" integer NOT NULL,
	"start_chainage_m" double precision NOT NULL,
	"end_chainage_m" double precision NOT NULL,
	"ascent_m" double precision,
	"descent_m" double precision,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "stages" (
	"id" serial PRIMARY KEY NOT NULL,
	"journey_id" integer NOT NULL,
	"order_index" integer NOT NULL,
	"start_chainage_m" double precision NOT NULL,
	"end_chainage_m" double precision NOT NULL,
	"distance_m" double precision,
	"ascent_m" double precision,
	"descent_m" double precision,
	"overnight_accommodation_id" integer,
	"status" text DEFAULT 'planned' NOT NULL,
	"completed_at" timestamp,
	"rest_day" boolean DEFAULT false NOT NULL,
	"stopped_early_at_chainage_m" double precision,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "trails" (
	"id" serial PRIMARY KEY NOT NULL,
	"route_id" integer NOT NULL,
	"ref" text,
	"country" text,
	"region" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "water_sources" (
	"id" serial PRIMARY KEY NOT NULL,
	"route_id" integer NOT NULL,
	"name" text,
	"chainage_m" double precision NOT NULL,
	"geom" geometry(point),
	"seasonal" boolean DEFAULT false NOT NULL,
	"source" text DEFAULT 'osm' NOT NULL,
	"confidence" double precision DEFAULT 0.5 NOT NULL,
	"last_confirmed_at" timestamp,
	"report_count" integer DEFAULT 0 NOT NULL,
	"manual_override" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "accommodations" ADD CONSTRAINT "accommodations_route_id_routes_id_fk" FOREIGN KEY ("route_id") REFERENCES "public"."routes"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hazards" ADD CONSTRAINT "hazards_route_id_routes_id_fk" FOREIGN KEY ("route_id") REFERENCES "public"."routes"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "journeys" ADD CONSTRAINT "journeys_route_id_routes_id_fk" FOREIGN KEY ("route_id") REFERENCES "public"."routes"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "peak_routes" ADD CONSTRAINT "peak_routes_peak_id_peaks_id_fk" FOREIGN KEY ("peak_id") REFERENCES "public"."peaks"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "peak_routes" ADD CONSTRAINT "peak_routes_route_id_routes_id_fk" FOREIGN KEY ("route_id") REFERENCES "public"."routes"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "photos" ADD CONSTRAINT "photos_report_id_reports_id_fk" FOREIGN KEY ("report_id") REFERENCES "public"."reports"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sections" ADD CONSTRAINT "sections_route_id_routes_id_fk" FOREIGN KEY ("route_id") REFERENCES "public"."routes"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stages" ADD CONSTRAINT "stages_journey_id_journeys_id_fk" FOREIGN KEY ("journey_id") REFERENCES "public"."journeys"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stages" ADD CONSTRAINT "stages_overnight_accommodation_id_accommodations_id_fk" FOREIGN KEY ("overnight_accommodation_id") REFERENCES "public"."accommodations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "trails" ADD CONSTRAINT "trails_route_id_routes_id_fk" FOREIGN KEY ("route_id") REFERENCES "public"."routes"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "water_sources" ADD CONSTRAINT "water_sources_route_id_routes_id_fk" FOREIGN KEY ("route_id") REFERENCES "public"."routes"("id") ON DELETE no action ON UPDATE no action;