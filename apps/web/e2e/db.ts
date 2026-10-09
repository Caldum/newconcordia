import pg from 'pg';

// Local Supabase database (`pnpm db:start`). Tests use it only to set up game state.
const connectionString =
  process.env.E2E_DATABASE_URL ?? 'postgresql://postgres:postgres@127.0.0.1:54322/postgres';

export async function sql<Row extends pg.QueryResultRow>(text: string, values: unknown[] = []) {
  const client = new pg.Client({ connectionString });
  await client.connect();
  try {
    return (await client.query<Row>(text, values)).rows;
  } finally {
    await client.end();
  }
}
