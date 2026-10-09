// Runs the pgTAP suites on a plain PostgreSQL 17, without Docker (ADR 0011).
//
// Every run starts from an empty database: bootstrap.sql (the Supabase pieces the migrations use), every
// migration in order and seed.sql (pgTAP is loaded before the migrations), then each file in supabase/tests/database. Results follow TAP:
// a file passes when it ran exactly its plan and nothing failed.
//
//   pnpm db:test:native               all suites
//   pnpm db:test:native 080_ledger    the files whose name contains the filter
//
// Connection: PG* variables (defaults 127.0.0.1:5432, user and password postgres). psql comes from
// PG_BIN, else the default PostgreSQL 17 install on Windows, else PATH.
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const database = process.env.NATIVE_TEST_DATABASE ?? 'concordia_test';
const env = {
  ...process.env,
  PGHOST: process.env.PGHOST ?? '127.0.0.1',
  PGPORT: process.env.PGPORT ?? '5432',
  PGUSER: process.env.PGUSER ?? 'postgres',
  PGPASSWORD: process.env.PGPASSWORD ?? 'postgres',
};

const windowsBin = 'C:/Program Files/PostgreSQL/17/bin';
const psqlPath = process.env.PG_BIN
  ? join(process.env.PG_BIN, 'psql')
  : existsSync(join(windowsBin, 'psql.exe'))
    ? join(windowsBin, 'psql.exe')
    : 'psql';

// pgTAP as Supabase ships it, pinned by version and checksum.
const pgtap = {
  version: '1.3.3',
  url: 'https://github.com/theory/pgtap/archive/refs/tags/v1.3.3.tar.gz',
  sha256: '325ea79d0d2515bce96bce43f6823dcd3effbd6c54cb2a4d6c2384fffa3a14c7',
};

function psql(args, { input, db = database, allowFailure = false } = {}) {
  const result = spawnSync(psqlPath, ['-X', '-q', '-v', 'ON_ERROR_STOP=1', '-d', db, ...args], {
    env,
    input,
    encoding: 'utf8',
    maxBuffer: 64 * 1024 * 1024,
  });
  if (result.error) throw new Error(`psql did not start (${psqlPath}): ${result.error.message}`);
  if (result.status !== 0 && !allowFailure) {
    throw new Error(`psql ${args.join(' ')} failed:\n${result.stderr}`);
  }
  return result;
}

/** Builds pgtap.sql from the release once and keeps it in node_modules/.cache. */
function pgtapSql() {
  const cache = join(root, 'node_modules', '.cache', 'concordia-pgtap', pgtap.version);
  const target = join(cache, 'pgtap.sql');
  if (existsSync(target)) return target;

  mkdirSync(cache, { recursive: true });
  const archive = join(cache, 'pgtap.tar.gz');
  const download = spawnSync('curl', ['-sSfL', '-o', archive, pgtap.url], { encoding: 'utf8' });
  if (download.status !== 0) throw new Error(`Could not download pgTAP: ${download.stderr}`);
  const digest = createHash('sha256').update(readFileSync(archive)).digest('hex');
  if (digest !== pgtap.sha256) throw new Error(`pgTAP checksum mismatch: ${digest}`);
  // Relative paths from the cache: GNU tar would read «C:» as a remote host.
  const extract = spawnSync('tar', ['-xzf', 'pgtap.tar.gz'], { cwd: cache, encoding: 'utf8' });
  if (extract.status !== 0) throw new Error(`Could not extract pgTAP: ${extract.stderr}`);

  // What pgTAP's Makefile does for PostgreSQL 17: no version patches, only these substitutions.
  const source = readFileSync(join(cache, `pgtap-${pgtap.version}`, 'sql', 'pgtap.sql.in'), 'utf8');
  const numericVersion = pgtap.version.split('.').slice(0, 2).join('.');
  writeFileSync(
    target,
    source
      .replaceAll('MODULE_PATHNAME', '$libdir/pgtap')
      .replaceAll('__OS__', process.platform)
      .replaceAll('__VERSION__', numericVersion),
  );
  return target;
}

function freshDatabase() {
  psql(['-c', `drop database if exists ${database} with (force)`], { db: 'postgres' });
  psql(['-c', `create database ${database}`], { db: 'postgres' });
  // Supabase's search path, so tests call pgTAP and extensions unqualified.
  psql(['-c', `alter database ${database} set search_path = "$user", public, extensions`], {
    db: 'postgres',
  });
  psql(['-f', join(root, 'supabase', 'native', 'bootstrap.sql')]);
  // Before the migrations, as on Supabase: the security baseline closes what is created after it.
  psql(['-c', 'set search_path = extensions', '-f', pgtapSql()]);

  const migrations = readdirSync(join(root, 'supabase', 'migrations'))
    .filter((file) => file.endsWith('.sql'))
    .sort();
  for (const file of migrations) {
    psql(['--single-transaction', '-f', join(root, 'supabase', 'migrations', file)]);
  }
  const seed = join(root, 'supabase', 'seed.sql');
  if (existsSync(seed)) psql(['-f', seed]);

  return migrations.length;
}

/** pgTAP is loaded into `extensions` already, so the tests' `create extension` line is skipped. */
function runFile(file) {
  const sql = readFileSync(file, 'utf8').replace(
    /^create extension if not exists pgtap[^;]*;$/m,
    '-- pgtap is preloaded (native runner)',
  );
  const result = psql([], { input: sql, allowFailure: true });
  const output = result.stdout;
  const plan = Number(/^\s*1\.\.(\d+)/m.exec(output)?.[1] ?? NaN);
  const passed = [...output.matchAll(/^\s*ok \d+/gm)].length;
  const failed = [...output.matchAll(/^\s*not ok \d+/gm)].map((match) => match[0].trim());
  const errors = result.stderr
    .split('\n')
    .filter((line) => /ERROR/.test(line))
    .map((line) => line.trim());
  const ok = result.status === 0 && failed.length === 0 && errors.length === 0 && passed === plan;
  return { ok, plan, passed, failed, errors, details: output };
}

const filter = process.argv[2] ?? '';
const started = Date.now();
const migrations = freshDatabase();
console.warn(`Fresh database ${database}: ${String(migrations)} migrations applied.`);

const testsDir = join(root, 'supabase', 'tests', 'database');
const files = readdirSync(testsDir)
  .filter((file) => file.endsWith('.sql') && file.includes(filter))
  .sort();

let failures = 0;
for (const file of files) {
  const result = runFile(join(testsDir, file));
  const plan = Number.isNaN(result.plan) ? '?' : String(result.plan);
  console.warn(`${result.ok ? 'ok    ' : 'FAILED'} ${file}  ${String(result.passed)}/${plan}`);
  if (!result.ok) {
    failures += 1;
    for (const line of [...result.failed, ...result.errors]) console.warn(`         ${line}`);
    const diagnostics = result.details
      .split('\n')
      .filter((line) => /^\s*#/.test(line))
      .slice(0, 20);
    for (const line of diagnostics) console.warn(`         ${line.trim()}`);
  }
}

const seconds = ((Date.now() - started) / 1000).toFixed(1);
console.warn(
  failures === 0
    ? `All ${String(files.length)} files passed in ${seconds} s.`
    : `${String(failures)} of ${String(files.length)} files failed (${seconds} s).`,
);
process.exit(failures === 0 ? 0 : 1);
