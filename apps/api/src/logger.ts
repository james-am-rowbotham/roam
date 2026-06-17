// A tiny, dependency-free leveled logger for the API service.
//
// Goals: readable lines in the terminal during dev (colour + timestamp + a
// structured context blob), and parseable-ish output in prod. No external deps —
// just `console.*` and ANSI codes, gated on whether stdout is a TTY.
//
// Set the floor with LOG_LEVEL=debug|info|warn|error (default: debug in dev,
// info otherwise). `debug` is where the chatty per-request detail lives.

const LEVELS = { debug: 10, info: 20, warn: 30, error: 40 } as const;
export type LogLevel = keyof typeof LEVELS;

const envLevel = (process.env.LOG_LEVEL as LogLevel | undefined)?.toLowerCase() as
  | LogLevel
  | undefined;
const floor = LEVELS[envLevel ?? (process.env.NODE_ENV === 'production' ? 'info' : 'debug')];

// Only colour when attached to a terminal; piped/redirected output stays clean.
const useColor = Boolean(process.stdout.isTTY) && process.env.NO_COLOR == null;
const paint = (code: number, s: string) => (useColor ? `\x1b[${code}m${s}\x1b[0m` : s);
const dim = (s: string) => paint(2, s);
const bold = (s: string) => paint(1, s);

const LABEL: Record<LogLevel, string> = {
  debug: paint(90, 'DEBUG'), // grey
  info: paint(36, 'INFO '), // cyan
  warn: paint(33, 'WARN '), // yellow
  error: paint(31, 'ERROR'), // red
};

// Render the context object as `key=value` pairs. Errors get their stack pulled
// out onto its own lines so you actually see where it blew up.
function formatContext(ctx?: Record<string, unknown>): string {
  if (!ctx) return '';
  const parts: string[] = [];
  let trailer = '';
  for (const [key, value] of Object.entries(ctx)) {
    if (value === undefined) continue;
    if (value instanceof Error) {
      parts.push(`${key}=${paint(31, value.message)}`);
      if (value.stack) trailer += `\n${dim(value.stack)}`;
      continue;
    }
    const rendered =
      typeof value === 'object' ? JSON.stringify(value) : String(value);
    parts.push(`${dim(`${key}=`)}${rendered}`);
  }
  return (parts.length ? ` ${parts.join(' ')}` : '') + trailer;
}

function emit(level: LogLevel, msg: string, ctx?: Record<string, unknown>) {
  if (LEVELS[level] < floor) return;
  const ts = dim(new Date().toISOString());
  const line = `${ts} ${LABEL[level]} ${msg}${formatContext(ctx)}`;
  // Route to the matching console method so anything tailing stderr (warn/error)
  // still works as expected.
  if (level === 'error') console.error(line);
  else if (level === 'warn') console.warn(line);
  else console.log(line);
}

export const logger = {
  debug: (msg: string, ctx?: Record<string, unknown>) => emit('debug', msg, ctx),
  info: (msg: string, ctx?: Record<string, unknown>) => emit('info', msg, ctx),
  warn: (msg: string, ctx?: Record<string, unknown>) => emit('warn', msg, ctx),
  error: (msg: string, ctx?: Record<string, unknown>) => emit('error', msg, ctx),
  /** Helper for the startup banner — bold, no level noise. */
  banner: (msg: string) => console.log(bold(msg)),
};
