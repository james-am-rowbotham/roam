-- Enable Row Level Security on every public table.
--
-- These tables are exposed through Supabase PostgREST (reachable with the anon
-- key, which ships in the mobile app). Without RLS, that anon key grants direct
-- read/write to every row. Nothing legitimately uses PostgREST: the client only
-- talks to the Hono API, which connects as the table owner and bypasses RLS.
--
-- So we enable RLS with NO policies = default deny for anon/authenticated. This
-- closes the PostgREST hole without affecting the API. Add scoped policies later
-- only if a client is ever pointed directly at PostgREST.
ALTER TABLE "routes" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "trails" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "peaks" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "peak_routes" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "sections" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "water_sources" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "accommodations" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "hazards" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "reports" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "photos" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "journeys" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "stages" ENABLE ROW LEVEL SECURITY;
