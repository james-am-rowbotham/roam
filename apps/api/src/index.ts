import { OpenAPIHono } from '@hono/zod-openapi';
import { cors } from 'hono/cors';
import { logger } from './logger';
import { requestLogger } from './middleware/logging';
import { journeysRouter } from './routes/journeys';
import { poisRouter } from './routes/pois';
import { sectionsRouter } from './routes/sections';
import { trailsRouter } from './routes/trails';

const app = new OpenAPIHono();

// Log every request (method, path, status, duration, request id) before anything
// else so even requests that hit CORS preflight or a 404 are visible.
app.use('*', requestLogger());
app.use('*', cors());

app.get('/health', (c) => c.json({ status: 'ok' }));
app.route('/trails', trailsRouter);
app.route('/sections', sectionsRouter);
app.route('/pois', poisRouter);
app.route('/journeys', journeysRouter);

// Anything not matched above — log it so a misrouted client call is obvious
// instead of a silent 404.
app.notFound((c) => {
  logger.warn(`no route for ${c.req.method} ${c.req.path}`, { reqId: c.get('requestId') });
  return c.json({ error: 'not found' }, 404);
});

// Last-resort handler for anything a route throws (a failed query, a bad cast).
// This is the line you want when "I have no idea what's going on" — it prints the
// full stack with the request that triggered it, then returns a clean 500.
app.onError((err, c) => {
  logger.error(`unhandled error on ${c.req.method} ${c.req.path}`, {
    reqId: c.get('requestId'),
    err,
  });
  return c.json({ error: 'internal server error' }, 500);
});

// OpenAPI spec — Orval reads this to generate the typed client
app.doc('/openapi.json', {
  openapi: '3.0.0',
  info: { title: 'Roam API', version: '1.0.0' },
});

const port = Number.parseInt(process.env.PORT ?? '3000');
logger.banner(`Roam API listening on http://localhost:${port}`);
logger.info('server ready', {
  port,
  logLevel: process.env.LOG_LEVEL ?? (process.env.NODE_ENV === 'production' ? 'info' : 'debug'),
  dbLog: process.env.DB_LOG === 'true',
});

export default { port, fetch: app.fetch };
