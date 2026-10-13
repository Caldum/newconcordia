import { z } from 'zod';

/** Awaits a database call and validates every row it returns; throws the database error. */
export async function rows<T>(
  call: PromiseLike<{ data: unknown; error: unknown }>,
  schema: z.ZodType<T>,
): Promise<T[]> {
  const { data, error } = await call;
  if (error) throw error as Error;
  return z.array(schema).parse(data);
}
