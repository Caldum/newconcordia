import { z } from 'zod';

const envSchema = z.object({
  VITE_SUPABASE_URL: z.url({ protocol: /^https?$/ }),
  VITE_SUPABASE_PUBLISHABLE_KEY: z.string().min(20),
});

export type AppEnv = z.infer<typeof envSchema>;

/** Validates the public build-time configuration. Only public values live here, never secrets. */
export function parseEnv(source: Record<string, unknown>): AppEnv {
  const result = envSchema.safeParse(source);
  if (!result.success) {
    const fields = result.error.issues.map((issue) => issue.path.join('.')).join(', ');
    throw new Error(`Invalid or missing public configuration: ${fields}. See docs/setup.md.`);
  }
  return result.data;
}
