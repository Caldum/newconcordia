type Level = 'info' | 'error';

/** Structured JSON log line, searchable in Workers Logs. Never pass personal data. */
export function log(level: Level, message: string, fields: Record<string, unknown>): void {
  const line = JSON.stringify({ level, message, ...fields });
  if (level === 'error') console.error(line);
  // eslint-disable-next-line no-console -- the log sink of a Worker is the console.
  else console.log(line);
}
