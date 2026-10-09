import { z } from 'zod';

import type { JobName } from './jobs';

const jobRunSchema = z.object({
  status: z.enum(['succeeded', 'skipped', 'failed']),
  job: z.string(),
  slot: z.string(),
  result: z.unknown().optional(),
  error: z.string().nullable().optional(),
});

export type JobRun = z.infer<typeof jobRunSchema>;

export type RunJobOutcome =
  | { ok: true; run: JobRun }
  | { ok: false; reason: 'network_error' | 'http_error' | 'invalid_response'; detail: string };

type DatabaseEnv = Pick<Env, 'SUPABASE_URL' | 'SUPABASE_SECRET_KEY'>;

/** Asks the database to run a job for the slot that contains `scheduledAt` (see public.run_job). */
export async function runJob(
  job: JobName,
  scheduledAt: Date,
  env: DatabaseEnv,
): Promise<RunJobOutcome> {
  const headers = new Headers({
    'content-type': 'application/json',
    apikey: env.SUPABASE_SECRET_KEY,
  });
  // New `sb_secret_` keys travel only in `apikey`; a legacy service_role key is a JWT and also needs
  // the bearer header.
  if (env.SUPABASE_SECRET_KEY.startsWith('eyJ')) {
    headers.set('authorization', `Bearer ${env.SUPABASE_SECRET_KEY}`);
  }

  let response: Response;
  try {
    response = await fetch(`${env.SUPABASE_URL}/rest/v1/rpc/run_job`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ p_job: job, p_at: scheduledAt.toISOString() }),
    });
  } catch (error) {
    return { ok: false, reason: 'network_error', detail: errorMessage(error) };
  }

  if (!response.ok) {
    // The body may echo request details; only the status is logged.
    await response.body?.cancel();
    return { ok: false, reason: 'http_error', detail: `HTTP ${response.status}` };
  }

  const parsed = jobRunSchema.safeParse(await response.json());
  if (!parsed.success) {
    return { ok: false, reason: 'invalid_response', detail: parsed.error.message };
  }
  return { ok: true, run: parsed.data };
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
