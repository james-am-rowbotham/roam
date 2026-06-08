import { OpenAPIHono } from '@hono/zod-openapi';
import { cors } from 'hono/cors';
import { sectionsRouter } from './routes/sections';
import { trailsRouter } from './routes/trails';

const app = new OpenAPIHono();

app.use('*', cors());
app.get('/health', (c) => c.json({ status: 'ok' }));
app.route('/trails', trailsRouter);
app.route('/sections', sectionsRouter);

// OpenAPI spec — Orval reads this to generate the typed client
app.doc('/openapi.json', {
  openapi: '3.0.0',
  info: { title: 'Roam API', version: '1.0.0' },
});

const port = Number.parseInt(process.env.PORT ?? '3000');
console.log(`API listening on http://localhost:${port}`);

export default { port, fetch: app.fetch };
