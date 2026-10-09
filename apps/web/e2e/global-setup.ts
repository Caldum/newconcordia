import { sql } from './db';

/** Fails fast with a clear message when local Supabase is not running. */
export default async function globalSetup(): Promise<void> {
  try {
    await sql('select 1');
  } catch {
    throw new Error('E2E tests need local Supabase: run `pnpm db:start` first.');
  }
}
