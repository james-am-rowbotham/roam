import { defineConfig } from 'orval';

export default defineConfig({
  roam: {
    input: {
      // API must be running locally when you run codegen
      target: 'http://localhost:3000/openapi.json',
    },
    output: {
      mode: 'single',
      target: './lib/generated/api.ts',
      client: 'react-query',
      override: {
        mutator: {
          path: './lib/fetch-client.ts',
          name: 'fetchClient',
        },
        query: {
          useQuery: true,
          useSuspenseQuery: false,
        },
      },
    },
  },
});
