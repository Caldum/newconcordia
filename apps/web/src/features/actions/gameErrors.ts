/** Calls a game action and throws its database error, whose message is the stable code. */
export async function act<T = unknown>(call: PromiseLike<{ data: T; error: unknown }>): Promise<T> {
  const { data, error } = await call;
  if (error) throw error as Error;
  return data;
}

/** The stable code of a failed action, or `other`. */
export function errorCode(error: unknown): string {
  const message = (error as { message?: unknown } | null)?.message;
  return typeof message === 'string' && /^[a-z_]+$/.test(message) ? message : 'other';
}

/** The copy for a failed action: the catalog's `error_<code>`, or its `error_other`. */
export function problemText(copy: { error_other: string }, code: string): string {
  const text = (copy as unknown as Record<string, unknown>)[`error_${code}`];
  return typeof text === 'string' ? text : copy.error_other;
}
