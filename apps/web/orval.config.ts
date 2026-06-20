import { defineConfig } from 'orval';

// Generate the web's API types + fetchers from the live Hono OpenAPI spec, so
// trail/route shapes come from the backend — never hand-written (§19). The API
// must be running locally (`bun run dev:api`) when you run `bun run codegen`.
// We use the framework-agnostic `fetch` client (not react-query) because the
// web fetches in Server Components for SEO; `lib/api.ts` wraps these with ISR
// caching + graceful fallback.
export default defineConfig({
  roam: {
    input: { target: 'http://localhost:3000/openapi.json' },
    output: {
      mode: 'single',
      target: './lib/generated/api.ts',
      client: 'fetch',
      baseUrl: '',
      override: {
        mutator: { path: './lib/fetch-client.ts', name: 'fetchClient' },
      },
    },
  },
});
