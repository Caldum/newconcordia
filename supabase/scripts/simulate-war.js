// Simulates players in the independence war of a country, on a development database (ADR 0046).
//
//   SIM_DB_URL=postgresql://… node supabase/scripts/simulate-war.js
//
// Setup, as the database owner and recorded in the admin log as «Simulación»:
//   - invites the bots (bot01@sim.concordia.test …) to the closed beta and creates them as new citizens of the
//     country, through the sign-up trigger,
//     and each names SIM_REFERRER as who invited them (set_my_referrer, as any new citizen);
//   - turns the independence war sandbox on and opens the country's war if none is active, with SIM_TARGET damage;
//   - gives four founders civil level 5 (the level rewards pay their GOLD) so they can found an N1 company each.
// Then every bot plays through the public functions, as itself (the same JWT claims PostgREST sets): founders open
// their company and hire, the rest take a job; each bot trains, works once a game day and strikes whenever it has
// energy, at a human pace. The database decides everything, as for any player.
//
// Options: SIM_COUNTRY (ARG), SIM_BOTS (20), SIM_MINUTES (120), SIM_TARGET (6000), SIM_REFERRER (NachoCaldum),
// SIM_FOOD (0): Q1 rations each bot receives at the start, a simulation supply recorded as such in the inventory
// movements, so automatic food keeps them fighting (10 energy every 5 minutes per ration).
// Never point it at production: it creates accounts and opens a war.

import { randomUUID } from 'node:crypto';

import pg from 'pg';

const url = process.env.SIM_DB_URL;
if (!url) {
  console.error('Set SIM_DB_URL to the development database.');
  process.exit(1);
}
const country = process.env.SIM_COUNTRY ?? 'ARG';
const botCount = Number(process.env.SIM_BOTS ?? 20);
const minutes = Number(process.env.SIM_MINUTES ?? 120);
const target = Number(process.env.SIM_TARGET ?? 6000);
// Who invited the bots: they sign up as this citizen's referrals.
const referrer = process.env.SIM_REFERRER ?? 'NachoCaldum';
const food = Number(process.env.SIM_FOOD ?? 0);
const until = Date.now() + minutes * 60_000;

const heroes = [
  'Belgrano',
  'San Martín',
  'Güemes',
  'Azurduy',
  'Moreno',
  'Castelli',
  'Saavedra',
  'Pueyrredón',
  'Brown',
  'Dorrego',
  'Lamadrid',
  'Las Heras',
  'Alvear',
  'Arenales',
  'Necochea',
  'Pringles',
  'Paso',
  'Larrea',
  'Monteagudo',
  'Balcarce',
  'Viamonte',
  'Rondeau',
  'Soler',
  'Pinto',
];
// Founders and where their company extracts (a resource each region has).
const companies = [
  { name: 'Cooperativa Belgrano', good: 'food_raw', region: `${country}-01` },
  { name: 'Minas del Norte', good: 'military_raw', region: `${country}-03` },
  { name: 'Botica Federal', good: 'medical_raw', region: `${country}-04` },
  { name: 'Petrolera Cuyana', good: 'military_raw', region: `${country}-05` },
];
const perCompany = Math.ceil(botCount / companies.length);

// The pooler's certificate is signed by Supabase's own authority; the link is still encrypted.
const pool = new pg.Pool({ connectionString: url, ssl: { rejectUnauthorized: false }, max: 8 });

const stats = { strikes: 0, damage: 0, trained: 0, worked: 0, refused: {} };
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const between = (min, max) => min + Math.random() * (max - min);
const log = (...parts) => {
  console.warn(new Date().toISOString().slice(11, 19), ...parts);
};

/** Runs a query as the database owner. */
async function owner(sql, params = []) {
  return (await pool.query(sql, params)).rows;
}

/** Runs a public function as a player: the JWT claims and role PostgREST would set, in one transaction. */
async function asPlayer(userId, sql, params = []) {
  const client = await pool.connect();
  try {
    await client.query('begin');
    await client.query("select set_config('request.jwt.claims', $1, true)", [
      JSON.stringify({ sub: userId, role: 'authenticated' }),
    ]);
    await client.query('set local role authenticated');
    const { rows } = await client.query(sql, params);
    await client.query('commit');
    return { rows, error: null };
  } catch (error) {
    // The transaction is already lost; the original error is what matters.
    await client.query('rollback').catch(() => null);
    return { rows: [], error: String(error.message ?? error) };
  } finally {
    client.release();
  }
}

function refused(code) {
  stats.refused[code] = (stats.refused[code] ?? 0) + 1;
}

async function setup() {
  const bots = [];
  for (let index = 0; index < botCount; index += 1) {
    const number = String(index + 1).padStart(2, '0');
    const email = `bot${number}@sim.concordia.test`;
    const name = `Bot ${heroes[index % heroes.length]}${index >= heroes.length ? ` ${number}` : ''}`;
    let [row] = await owner('select id from auth.users where email = $1', [email]);
    if (!row) {
      // A closed beta lets in only invited emails: the bots are invited like anyone else.
      await owner(
        `insert into game.beta_invites (email, invited_by, note, created_at)
         values ($1, null, 'Simulación', now()) on conflict (email) do nothing`,
        [email],
      );
      [row] = await owner(
        `insert into auth.users (instance_id, id, aud, role, email, encrypted_password, raw_user_meta_data,
                                 raw_app_meta_data, email_confirmed_at, created_at, updated_at)
         values ('00000000-0000-0000-0000-000000000000', gen_random_uuid(), 'authenticated', 'authenticated', $1, '',
                 jsonb_build_object('citizen_name', $2::text, 'country_code', $3::text, 'locale', 'es'),
                 '{"provider":"email","providers":["email"]}', now(), now(), now())
         returning id`,
        [email, name, country],
      );
      log('created', name);
    }
    const referral = await asPlayer(row.id, 'select public.set_my_referrer($1)', [referrer]);
    if (referral.error && !referral.error.includes('referral_closed'))
      log(name, 'referral', referral.error);
    bots.push({ id: row.id, name, index });
  }

  await owner(
    `with before as (select value from game.balance_params where key = 'independence_war_enabled')
     , changed as (update game.balance_params set value = 1 where key = 'independence_war_enabled' and value <> 1
                   returning value)
     insert into game.admin_log (actor_user_id, actor_name, action, target, before, after, created_at)
     select null, 'Simulación', 'set_param', 'independence_war_enabled',
            jsonb_build_object('value', (select value from before)), jsonb_build_object('value', 1), now()
     where exists (select 1 from changed)`,
  );
  let [war] = await owner(
    "select id, damage_target from game.independence_wars where country_code = $1 and status = 'active'",
    [country],
  );
  if (!war) {
    [war] = await owner(
      `insert into game.independence_wars (country_code, damage_target, started_by, started_at, ends_at)
       values ($1, $2, null, game.now(),
               game.now() + make_interval(days => game.param('independence_war_days')::integer))
       returning id, damage_target`,
      [country, target],
    );
    await owner(
      `insert into game.admin_log (actor_user_id, actor_name, action, target, before, after, created_at)
       values (null, 'Simulación', 'start_independence_war', $1, null,
               jsonb_build_object('war_id', $2::bigint, 'damage_target', $3::bigint), now())`,
      [country, war.id, target],
    );
    log(`opened the independence war of ${country}: #${war.id}, target ${target}`);
  } else {
    log(`the independence war of ${country} is under way: #${war.id}, target ${war.damage_target}`);
  }

  // Founders reach civil level 5 the ordinary way: XP, and each new level pays its GOLD.
  for (let index = 0; index < companies.length && index * perCompany < bots.length; index += 1) {
    const founder = bots[index * perCompany];
    await owner(
      `select game.add_civil_xp($1, greatest(0, game.experience_for_level(5) - s.experience))
       from game.player_stats as s where s.user_id = $1`,
      [founder.id],
    );
    founder.founds = companies[index];
  }
  if (food > 0) {
    const supply = `simulation:${new Date().toISOString()}`;
    for (const bot of bots) {
      await owner(
        `select game.put_goods(game.holder_for_citizen($1), 'food_q1', $2, $3, 'simulation_supply', $4)`,
        [bot.id, country, food, `${supply}:${bot.id}`],
      );
    }
    log(`supplied ${food} rations to each bot`);
  }
  return { bots, warId: Number(war.id) };
}

async function openCompany(bot, bots) {
  const plan = bot.founds;
  let [company] = await owner('select id from game.companies where name = $1', [plan.name]);
  if (!company) {
    const founded = await asPlayer(bot.id, 'select public.found_company($1, $2, $3, $4) as id', [
      plan.name,
      plan.good,
      plan.region,
      randomUUID(),
    ]);
    if (founded.error) {
      log(bot.name, 'could not found', plan.name, founded.error);
      return;
    }
    company = founded.rows[0];
    log(bot.name, 'founded', plan.name);
  }
  const hires = bots.filter(
    (other) => other !== bot && Math.floor(other.index / perCompany) === bot.index / perCompany,
  );
  const offer = await asPlayer(bot.id, 'select public.set_company_offer($1, $2, $3)', [
    company.id,
    300,
    hires.length,
  ]);
  if (offer.error) log(bot.name, 'offer', offer.error);
  const fund = await asPlayer(bot.id, 'select public.fund_company($1, $2, $3)', [
    company.id,
    5000,
    randomUUID(),
  ]);
  if (fund.error && !fund.error.includes('insufficient')) log(bot.name, 'fund', fund.error);
  for (const hire of hires) {
    const job = await asPlayer(hire.id, 'select public.take_job($1)', [company.id]);
    if (job.error && !/already|employed/.test(job.error)) log(hire.name, 'job', job.error);
  }
}

async function profile(bot) {
  const { rows } = await asPlayer(bot.id, 'select energy, health from public.get_my_profile()');
  return rows[0] ?? { energy: 0, health: 0 };
}

async function dailyChores(bot) {
  const trained = await asPlayer(bot.id, "select * from public.train('basic')");
  if (!trained.error) stats.trained += 1;
  else if (!trained.error.includes('already_trained')) refused(trained.error);
  const worked = await asPlayer(bot.id, 'select * from public.work($1)', [randomUUID()]);
  if (!worked.error) stats.worked += 1;
  else if (!worked.error.includes('already_worked')) refused(worked.error);
}

async function play(bot, warId) {
  // Arrive at different moments, as people do.
  await sleep(between(0, 60_000));
  let day = '';
  while (Date.now() < until) {
    const today = new Date().toISOString().slice(0, 10);
    if (today !== day) {
      day = today;
      await dailyChores(bot);
    }
    const { energy, health } = await profile(bot);
    if (health > 0 && energy >= 10) {
      // Usually one strike, sometimes a short burst.
      const burst = Math.random() < 0.2 ? Math.min(3, Math.floor(energy / 10)) : 1;
      for (let strike = 0; strike < burst; strike += 1) {
        const result = await asPlayer(
          bot.id,
          'select damage, war_status from public.independence_attack($1, $2)',
          [warId, randomUUID()],
        );
        if (result.error) {
          refused(result.error);
          if (result.error.includes('war_closed')) return;
          break;
        }
        stats.strikes += 1;
        stats.damage += Number(result.rows[0].damage);
        if (result.rows[0].war_status !== 'active') {
          log(`${bot.name} landed the strike that ends the war (${result.rows[0].war_status})`);
          return;
        }
        await sleep(between(1500, 4000));
      }
      await sleep(between(25_000, 90_000));
    } else {
      // Waiting for food (every 5 minutes) or the hourly recharge.
      await sleep(between(120_000, 240_000));
    }
  }
}

async function report(warId) {
  const [war] = await owner(
    `select w.status, w.damage_total, w.damage_target, c.name as hero
     from game.independence_wars as w left join game.citizens as c on c.user_id = w.hero_user_id where w.id = $1`,
    [warId],
  );
  log(
    `war #${warId}: ${war.damage_total}/${war.damage_target} (${war.status})${war.hero ? `, hero ${war.hero}` : ''}`,
    `| strikes ${stats.strikes}, damage ${stats.damage}, trained ${stats.trained}, worked ${stats.worked}`,
    Object.keys(stats.refused).length ? `| refused ${JSON.stringify(stats.refused)}` : '',
  );
  return war;
}

const { bots, warId } = await setup();
for (const bot of bots.filter((b) => b.founds)) await openCompany(bot, bots);
log(`${bots.length} bots fighting for ${minutes} minutes`);
const reporter = setInterval(() => {
  report(warId).catch((error) => log('report failed', error.message));
}, 60_000);
await Promise.all(bots.map((bot) => play(bot, warId)));
clearInterval(reporter);
await report(warId);
await pool.end();
