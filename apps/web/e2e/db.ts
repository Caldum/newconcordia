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

/**
 * Gives a player money created for the test. Minting needs an authorized reason (ADR 0016), so the `test`
 * reason exists only inside this transaction and never stays in the database.
 */
export async function mintForTest(userId: string, currency: string, hundredths: number) {
  const client = new pg.Client({ connectionString });
  await client.connect();
  try {
    await client.query('begin');
    await client.query(
      `insert into game.mint_reasons (kind, authority, description)
       values ('test', 'system_reward', 'End-to-end test funding.')`,
    );
    await client.query(
      `select game.transfer(game.system_account('issuer', $2), game.citizen_account($1, $2), $3, 'test', null)`,
      [userId, currency, hundredths],
    );
    await client.query(`delete from game.mint_reasons where kind = 'test'`);
    await client.query('commit');
  } catch (error) {
    await client.query('rollback');
    throw error;
  } finally {
    await client.end();
  }
}
