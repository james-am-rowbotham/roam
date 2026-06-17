import type { MiddlewareHandler } from 'hono';
import { logger } from '../logger';

// Per-request logging. Assigns each request a short id, logs the incoming
// request at debug, and logs a one-line summary on the way out with the status
// and how long it took. The status colour makes 4xx/5xx jump out in the terminal.
//
// The request id is stashed on the context (`c.get('requestId')`) and echoed
// back as the `X-Request-Id` response header, so a line in the logs can be tied
// to a specific client call. The error handler reads the same id (see index.ts).

declare module 'hono' {
  interface ContextVariableMap {
    requestId: string;
  }
}

const statusColor = (status: number): number => {
  if (status >= 500) return 31; // red
  if (status >= 400) return 33; // yellow
  if (status >= 300) return 36; // cyan
  return 32; // green
};

export const requestLogger = (): MiddlewareHandler => async (c, next) => {
  const requestId = crypto.randomUUID().slice(0, 8);
  c.set('requestId', requestId);
  c.header('X-Request-Id', requestId);

  const { method } = c.req;
  const path = c.req.path;
  const start = performance.now();

  logger.debug(`→ ${method} ${path}`, {
    reqId: requestId,
    query: c.req.query(),
  });

  await next();

  const ms = Math.round((performance.now() - start) * 10) / 10;
  const status = c.res.status;
  const colored =
    process.stdout.isTTY && process.env.NO_COLOR == null
      ? `\x1b[${statusColor(status)}m${status}\x1b[0m`
      : String(status);

  // 5xx is a server problem worth surfacing at warn even if the level is raised.
  const log = status >= 500 ? logger.warn : logger.info;
  log(`← ${method} ${path} ${colored}`, { reqId: requestId, ms });
};
