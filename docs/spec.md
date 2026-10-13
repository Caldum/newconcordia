# Concordia · Consolidated functional specification (GDD + SRS)

Version 3.1 (the document header says 3.0) · 12 October 2026 · Functional baseline with explicit technical
assumptions. English translation of the owner's `Concordia_Documento_Maestro_v3.1.md`; the Spanish original
wins if the two ever disagree. **This document is the highest source of truth** (ADR 0014): where it differs
from `docs/brief.md` or `docs/gdd.md`, it wins; where it is silent, they still apply.

## 0. How to read this document

- Recent decisions take precedence over earlier proposals. No unapproved proposal becomes a rule by
  appearing here.
- `CONFIRMED` marks a decided requirement; `ASSUMPTION` an operating rule implemented provisionally and
  documented for review; `PENDING` a value or formula not decided yet, without opening new questionnaires.
- Money is not created when it moves between institutions; it is created only when an explicit rule
  authorizes issuing currency or a system reward.
- Operations that combine balances, inventories, XP, taxes or legal effects must be atomic, idempotent,
  auditable and consistent.

## 1. Vision, world and accounts

- Persistent browser MMO by countries and regions, with citizenship, political participation, market,
  industry, finance, diplomacy, armed forces and health.
- Persistent countries and regions; a country without regions still exists legally, with citizenship and
  public bodies, and may try to recover territories.
- The player has a nationality, a location, civil experience, civil level, permanent military strength,
  military experience, internal rank, health (0–100), energy (reference maximum 100), inventories and wealth.
- Sign-up grant: 5 GOLD, 100 of the home country's currency and 10 Q1 food.
- At zero health a citizen cannot work, train or attack; they can use personal medical kits. They cannot
  travel until healed if they were already at 0 HP.
- Civil levels: minimum accumulated total XP `100 × L²` to reach level `L` (ASSUMPTION: initial level 0 and
  first step 100 XP). Reward: 1 GOLD per new level reached (issued by the system). Never pay the same reward
  twice.
- Civil XP comes from work and other actions by rules still to define, from training (1 XP per strength
  point gained) and from combat (1 XP per point of valid damage, before bonuses).
- Food Q1 to Q5 restores 10/20/30/40/50 energy per unit. Every five minutes the system automatically consumes
  the lowest-quality sufficient food and restores **up to 10 energy**. [ASSUMPTION: the food is consumed
  whole, at most +10 is recovered per interval and any excess is lost. What «sufficient» means when no food
  covers the demand exactly is open; apply the lowest available Q that gives at least the missing energy up
  to ten.]
- Inventories are separate per holder: citizen, company, ministry, hospital; transfers with an event and
  permission checks.

## 2. Government and offices

- Five ministries: Economy, Defense, Foreign Affairs, Health and Development.
- President and vice president are elected on a joint ticket every month; both offices are incompatible with
  other national offices. They can never be vacant: atomic succession covers them.
- Presidency: at most two consecutive elected monthly terms, then one out; succession does not count as an
  election. No re-election limit for the vice presidency.
- Running for president or vice president requires citizenship of the country, civil level ≥ 15 and
  membership of a national party. During the term they cannot change citizenship or party.
- The president proposes bills without limit, appoints and removes ministers and the Central Bank governor,
  issues administrative decrees within the legal framework, and is the only official who can launch military
  offensives. No veto, no dissolving Congress, no referendums, no extraordinary legislative powers and no
  spending without authorization.
- The vice president presides over Congress and votes only to break ties, with no ordinary vote and no
  legislative initiative.
- Ministers: national citizens of civil level ≥ 10, no party required, may change party but not citizenship
  in office, each may propose 1 law per term. A vacancy blocks the office's exclusive powers until replaced.
- Central Bank governor: appointed and removed by the president, national citizen, level ≥ 15; incompatible
  with any other national office. A vacancy suspends its operations.
- Nobody holds incompatible national offices. Promotion by succession vacates the previous office at once.
- Succession: vice president; ministers by highest civil XP; members of Congress by highest XP; other national
  citizens by highest XP; ordinary requirements: nationality, level ≥ 10 and party membership; ties broken by
  account age. If nobody is eligible, an exception over national citizens applies [ASSUMPTION: deterministic
  highest-XP rule among nationals to guarantee continuity].
- President and vice president cannot resign until Congress approves by simple majority. 72 hours of
  inactivity since last sign-in allow removal by absolute majority of all members of Congress, with
  notifications; removal is never automatic.
- Impeachment of the president, proposed by any member of Congress: 24-hour vote, yes from ≥ 2/3 of all
  members; one active petition per target, no cooldown; the president keeps their powers during the trial.

## 3. Electoral calendar, Congress and laws

- All election dates and times are UTC; voting lasts 24 h, anti-fraud validation 12 h, the outgoing authority
  keeps its power until the incoming one takes office.
- President: vote from day 5 00:00 to day 6 00:00, takes office day 6 12:00. Party leaders: vote on day 15,
  take office day 16 12:00. Congress: vote on day 25, take office day 26 12:00.
- Candidacy registration closes 24 h before the vote.
- National vote: civil level ≥ 5. Seats `max(8, floor(A / 50))`, where `A` is the national citizens with
  civil level ≥ 5 who signed in during the last seven days. Immutable snapshot 24 h before the legislative
  election starts; no maximum. Seats can stay vacant for lack of candidates.
- Proportional seats by D'Hondt, national constituency, 1 % threshold of valid votes. Ties in elections and
  seat allocation go by seniority of the party or candidacy [ASSUMPTION: priority by creation or
  registration date, then immutable id if dates tie].
- Party: founding burns 50 GOLD. Funded by donations. Legislative list: 10 GOLD from the party (5 to the
  Treasury, 5 burned). Presidential ticket: 20 GOLD (10 to the Treasury, 10 burned).
- Election rewards: president 10 GOLD, vice president 5 GOLD, each elected member of Congress 5 GOLD, each
  minister 5 GOLD only after completing a full month in office.
- Bills per term: member of Congress up to 3, minister up to 1, president unlimited, vice president none.
  Bills cannot be withdrawn once presented.
- Votes last 24 h. Quorum for laws: absolute majority of occupied seats; abstentions count for quorum, not in
  favor. Ordinary laws, economic laws and currency issuance: absolute majority of valid votes cast;
  expropriation: 2/3 of valid votes cast. [ASSUMPTION: valid votes for approval percentages are yes and no;
  abstention only counts for quorum; legal rounding with integers and cross-multiplication.] Impeachment:
  2/3 of all members of Congress.
- Every bill that requires spending reserves all the funds it needs when it is presented (escrow per currency
  and origin). Rejection releases them; approval executes atomically. If execution fails, every effect is
  reverted, the reservation released and an approved-but-not-executed record kept. Reservations prevent
  double spending.
- Expropriation by a 2/3 law: compensation to the owner equal to **two daily reference wages of that
  company**; severance set by law; the State acquires the firm, its balances and inventory and puts it up for
  sale at the average price of applicable quotes, with the proceeds to the Treasury. [ASSUMPTION: if no
  historical reference wage exists, compute it with a documented fallback rule without changing the formula.]

## 4. Currencies, Treasury, Central Bank and ministries

- GOLD is the global currency; every nation has its own currency; foreign exchange goes through pairs against
  GOLD: ARS → GOLD → BRL. Free price from offers and bids; the initial reference of about 1 GOLD = 100 national
  units is not a mandatory parity.
- GOLD and national currencies have two decimals; the ledger uses integer minor units (hundredths) to avoid
  floating point.
- National currency is issued only by a law approved by Congress; the central bank does not print GOLD or
  currencies.
- The Treasury holds GOLD and national currency; GOLD transfers between states require a law and go into the
  receiver's Treasury.
- Central Bank: institutional assets, immutable ledger, may trade GOLD and any national currency it holds on
  FOREX; may send the GOLD or currencies it holds to its Treasury with no minimum. Central Bank transfers to
  companies located in the national territory, whoever owns them, require an individual single-use
  authorization from the Economy minister with amount, currency and receiver defined. Without a governor it
  is paralyzed.
- Treasury funds are assigned by law to **each ministry** (GOLD and national currency) and moved to its own
  institutional account. Each minister spends freely within their approved competences; they cannot move
  funds between ministries. Funds do not expire or return at the end of a term, removal or resignation;
  assets and inventories stay with the institution. A vacancy blocks exclusive operations.
- Every ministerial operation publishes amount, currency, destination, who ordered it and when, fully
  traceable. **Defined privacy exception:** the detailed inventory of medical kits per hospital is visible
  only to the Health minister and the president. Financial movements are public; avoid indirectly exposing
  sensitive health inventory through details of purely material redistributions.
- General competences: Economy runs economic policy and bank authorizations to companies; Defense manages
  military resources and designates 1 priority battle; Foreign Affairs runs legally enabled diplomacy; Health
  buys and distributes kits, runs hospitals and the care policy; Development runs approved infrastructure and
  exploration. Ministers cannot replace the initiative or reserved spending of Congress or the president.

## 5. Markets, trade and companies

- National markets; access licenses to foreign markets. Foreign-owned companies are allowed. The host State
  sets a foreign construction surcharge of 0–100 %, adjustable instantly. A uniform national export tax of
  0–100 % on sales in markets other than the production country (whatever the owner's nationality). Taxes are
  deducted automatically when sales execute; price and tax changes are logged.
- Economic and arms embargoes block direct trade and trade in products by country of origin, besides
  applicable nationality restrictions. [ASSUMPTION: record an immutable `origin_country_id` on production
  lots so origin cannot be laundered.]
- Exchange or trade orders allow partial execution with the rest visible. Public buy orders lock the full
  amount until executed or cancelled; partial execution releases or consumes proportionally. Price-time
  priority [ASSUMPTION].
- Companies: extractors only in regions with the right resource; manufacturers in any region. Fifteen
  resources: food (wheat, corn, rice, cattle, fish); military (iron, copper, coal, sulfur, oil); medical
  (cotton, latex, medicinal plants, salt, silica sand). Each unique active resource adds +5 % to national
  production up to +25 % (at most five bonus resources), without changing private ownership.
- Exploration: a campaign approved by law, lasting 7 days, consuming budgeted funds; **cost and success
  probability PENDING** (the owner chose an alternative without values). Do not invent them: model the
  configuration inactive until defined.
- Company infrastructure N1–N5: paid employee shifts per day 5/10/15/20/25; extractor efficiency bonus
  0/+25/+50/+75/+100 %; for manufacturing the level sets quality Q1–Q5. An N1 company costs 10 GOLD; upgrades
  N2 25, N3 50, N4 100, N5 200 (385 in total to N5). Civil level required for N1–N5: 5/10/20/30/40.
- An employee normally works 1 paid shift per day; a second shift only with the employer's individual
  authorization and a published per-shift wage. The owner may work 1 unpaid management shift PER OWN COMPANY
  each day, besides their job and outside the employee quota. No work, no production; without funds or
  inputs the company exists and stays open but cannot run work.
- Extractor output per shift: `floor(150 × efficiency_multiplier × health/100 × (1 + national_bonus))`, with
  defined bonuses and a single final rounding. Extraction yields the generic raw material of its kind: food,
  military or medical.
- Manufacturing output Q1–Q5 per shift before bonuses and health: food 100/90/80/70/60; weapons 10/9/8/7/6;
  medical kits 20/18/16/14/12. Input per unit: food `Q` food raw; weapons `10Q` military raw; kits `5Q` medical
  raw. Final rounding per shift. [ASSUMPTION: the inputs actually debited must match the real output after
  bonuses, in one atomic transaction; producing units without inputs must be impossible.]
- Companies can be sold with their infrastructure and inventories by contract; government control by
  expropriation law is separate.

## 6. Military, attacks, resistance and diplomacy

- Health 0–100, energy 0–100 (initial reference maximum). Unarmed combat is allowed, with no consumable
  limit. An attack requires health > 0 and energy ≥ 10, and spends exactly 10 energy. Weapons are equipped
  MANUALLY, per unit, with remaining uses: Q1..Q5 last 1..5 attacks and give +20/+40/+60/+80/+100 % damage.
  When used up, the player continues unarmed automatically.
- Permanent military strength `F` with no maximum. Ranks: Novice, then **15 traditional names** of five levels
  I–V: Militia, Soldier, Corporal, Sergeant, First Sergeant, Warrant Officer, Chief Warrant Officer, Second
  Lieutenant, Lieutenant, First Lieutenant, Captain, Major, Lieutenant Colonel, Colonel, General. General V is
  the top; no Marshal or Grand Marshal. Each internal level step +5 % damage; 75 steps → +375 % maximum.
  Military XP keeps counting after the cap only as a statistic, with no rank or extra bonus.
- First rank Militia I at 100 XP; cumulative threshold of step `n`: `100 × n²`; the top rank n = 75 means
  562,500 XP. Military XP per attack = `floor(effective_damage × (1 + sum_of_experience_bonuses))`, credited at
  once. Civil XP per attack = the same rule on valid damage plus bonuses, excluding invalid damage.
- Damage per attack `floor((10 + F) × (HP / 100) × (1 + 0.2 × Q) × (1 + 0.05 × min(n, 75)))` with `Q = 0`
  unarmed. The regional war score is CUMULATIVE per side, **with no depletable resistance**, so all valid
  damage in battle counts for XP; do not apply an old cap based on a nonexistent target HP. [ASSUMPTION: an
  attack is valid only during an active round and from an eligible actor.]
- XP bonuses: enemy state +50 % and a priority battle order issued by the Defense minister +10 %, ADDITIVE
  (+60 % combined), for both civil and military XP; they never increase damage. Only one active priority
  battle per country.
- Training injuries by center level: N1 0.05 %, N2 0.10 %, N3 0.15 %, N4 0.20 %, N5 0.25 %; −5 HP if it
  happens; strength and XP are granted before the injury roll.
- Training: personal centers Basic / Advanced / Elite, one session per day per center; energy 10/15/20; fee per
  session GOLD 0/0.5/1.5; strength gained per level N1–N5: Basic 5/10/15/20/25, Advanced the same, Elite
  10/20/30/40/50. Civil XP 1 per strength point gained. Upgrade per center N2 5 GOLD, N3 10, N4 20, N5 40;
  75 GOLD in total per center.
- Attack injury: probability by energy **after** the attack: 90–100: 0.05 %; 70–89: 0.10 %; 50–69: 0.25 %;
  30–49: 0.50 %; 10–29: 1 %; 0–9: 2 %; severity if it happens `min(current_HP, 25, 5 × (100 − remaining_energy) /
  10)`; applied AFTER recording damage and XP, even if energy ends at zero. [ASSUMPTION: HP is quantized to an
  integer with floor if fractional.]
- NPC independence war at the start, up to 7 days or until a damage target is met early; only national
  citizens' damage counts for the permanent Liberating Hero title and provisional administration; the
  constitutional government forms before regular war. The hero's exact powers are PENDING.
- Regular war: a prior authorization law, 50 GOLD from the Treasury reserved when presented and spent when the
  authorization executes. ONLY the president can start offensives, within 24 h; if the deadline passes the
  authorization expires and the 50 GOLD return to the Treasury. [Technical ASSUMPTION: the spending moves to a
  refundable escrow on approval and is burned only when the president launches; keeps the lock and refund
  semantics.] War against a country declared enemy: designated by law, at most one per country, lets the
  president launch offensives at once without a new law or GOLD fee, +50 % XP against that country. A new law
  ends the designation.
- Regular war: for one region, at most 9 rounds of 1 h; the first side to win 5 rounds wins; a tied round goes
  to the defender. A region supports only one active battle of any kind; 24 h cooldown for ordinary war after a
  battle, except immediate resistance. The winning attacker annexes the region. A country without regions keeps
  existing.
- Resistance: 10 DISTINCT organizers of any citizenship each pay 2 GOLD, burned; it starts at once if the region
  is occupied and has no other active battle; 9 rounds of 1 h, the first to 5 wins; a tied round goes to the
  occupying country, which defends. If the resistance wins, the region returns at once to the country that held
  it just before the last occupation, and each of the ten organizers receives 5 GOLD from the system, with no
  limit or cooldown beyond regional restrictions. Inflation risk explicitly accepted.
- Regional eligibility: nationals and allies may attack or defend their country or ally remotely without
  traveling; foreign non-allied fighters must be physically present in the region. Allies take part without a
  special intervention law.
- Alliances last until legally ended and need laws of both nations to be created. Breaking relations expels
  ambassadors and ends bilateral (not multilateral) treaties. Embargoes restrict direct trade and products
  originating in the sanctioned nation; arms and economic embargoes are separate. Peace requires a law.

## 7. Public health and hospitals

- There is no passive health regeneration. Personal medical kits Q1–Q5 heal 5/10/15/20/25 HP (maximum 100) and
  can be used between attacks. The whole unit is consumed even if HP is wasted.
- At most one public hospital per region, infrastructure N1–N5. Building N1 50 GOLD; upgrades N2 75, N3 100,
  N4 125, N5 150; 500 GOLD in total to N5. The Health ministry's institutional GOLD pays construction and
  upgrades; its institutional national currency buys kits.
- Hospitals hold NO money: only physical stock of Q1–Q5 kits. A level N hospital can use Q ≤ N; healing
  depends on the kit's quality: at most +5 × Q HP. A treatment consumes exactly **one** kit; the patient may
  ask for more treatments. The system picks automatically **the lowest compatible quality sufficient** for the
  missing HP among the stock; if none covers it fully, it picks a lower available quality for partial
  recovery [ASSUMPTION to avoid blocking with useful stock]. A kit exceeding the missing HP wastes the excess.
- The Health minister buys on markets the State can access, by direct purchase or public buy orders with
  reserved funds. They can redistribute kits instantly between their hospitals; no physical transport.
- Hospital care is free for the patient, with no money spent per treatment. The hospital refuses care if it
  has no compatible kit. No daily treatment limit. The citizen must be in the hospital's region. At 0 HP they
  can use a personal kit but cannot travel until healed.
- The Health minister sets the national care policy instantly, with a log: universal; nationals only;
  nationals plus non-enemy countries; nationals plus allies.
- Detailed health stock per hospital and physical movements are restricted to the Health ministry and the
  presidency; ministerial money spending stays public.

## 8. Government and technical milestones

**Suggested architecture, not a functional decision:** an initial modular monolith with strict domain
boundaries and messaging or an outbox; split critical components into services when justified. Frontend
Next.js/React + TypeScript, backend NestJS + TypeScript, PostgreSQL as the source of truth, Redis for cache and
queues with idempotency and workers; WebSocket/SSE for battle and market; REST for transactional operations.
Exact frameworks to confirm during technical execution, without reinterpreting mechanics. (ADR 0014 keeps the
current stack, which meets these requirements.)

**Bounded contexts:** Identity and Citizens; Geography and Citizenship; Parties and Elections; Institutions and
Offices; Laws and Budgets; Ledger, Treasury and Central Bank; Market and FX; Companies and Production;
Inventories and Logistics; Combat and Wars; Diplomacy; Health and Hospitals; Moderation and Anti-fraud; Audit
and Notifications.

**Minimum entities:** users, characters, countries, regions, citizenship_applications, party, party_membership,
elections, candidacies, votes, electoral_snapshots, legislative_seats, office_appointments, succession_events,
bills, bill_votes, law_executions, treasury_accounts, ministry_accounts, ledger_entries, escrow_reservations,
currency_mints, central_bank_authorizations, marketplaces, market_orders, market_trades, fx_orders,
tax_policies, companies, company_upgrade_events, employee_contracts, work_shifts, resource_deposits,
exploration_campaigns, inventories, inventory_lots, inventory_movements, training_centers, training_sessions,
military_progress, battles, battle_rounds, battle_attacks, battle_participants, battle_orders,
resistance_organizers, diplomatic_treaties, embargoes, hospitals, treatments, public_audit_events,
private_audit_events, outbox_events, idempotency_keys.

**Technical invariants:**

1. Balances in integer hundredths; double entry sums to zero except explicit issuance or burning.
2. Never two incompatible active national offices per citizen; president and vice president always covered
   transactionally.
3. No double vote; snapshots and counts immutable after validation.
4. At most one active battle per region; only the president starts offensives; no duplicate launches under
   concurrency.
5. Idempotent attacks: they debit energy and one use, add damage and XP and decide the injury exactly once.
6. Idempotent training per UTC day, center and player; one GOLD and energy charge per session.
7. Wages, production and inputs atomic, with non-negative stocks.
8. A buy order locks the money before it is published; partial execution keeps the exact reservation.
9. Public invoices and state purchases can be consulted; hospital stock private by RBAC.
10. Level and resistance rewards issued once per validated event; anti-fraud rules never silently cancel
    legitimate rewards.

## 9. Explicit assumptions and gaps (do not reopen the questionnaire)

1. **Exploration:** the owner chose «other values» without amount or probability; keep it configurable and
   inactive in the MVP until told otherwise.
2. **Liberating Hero:** provisional administration powers, damage threshold and first-government mechanism to
   configure.
3. **Schedules and regional eligibility:** travel cost and time, company and market fees in detail, license
   modality, yields of individual resources; resolve with versioned balance values, not invented as confirmed.
4. **Wages:** complete labor market rules, reference values per company, severance concepts; keep history for
   expropriation.
5. **Votes:** abstentions only for quorum; ties by seniority; vacancies and succession exceptions.
6. **Energy and food:** automatic every 5 min when energy is missing and food exists; at energy 100 consume
   nothing; handle unexecuted intervals with the server clock, without per-player processes.
7. **Hospital:** deterministic algorithm for the lowest sufficient quality and the next compatible quality when
   short, without exposing confidential inventory.
8. **Currencies:** to allow +0.5 GOLD and decimals, use hundredths for transfers; XP rewards integer after floor;
   stock units integer.
9. **Quality Q and production costs:** raw material components and national derivation per nation; resource
   bonus applied to production and inventory consumption in one transaction.
10. **Economic safety:** concurrency limits, resistance abuse, trading between associated accounts, self-buying
    and inflation cannot alter confirmed rewards; first monitor, alert and document.
11. **Refund of 50 GOLD for a war not launched:** keep it in refundable escrow and burn it only when an attack is
    launched; keep legal spending and authorization separate.
12. **Civil levels:** index 0 is the start of the 100 × L² progression; showing a visible initial level 1 could
    shift the formula; fix a stable implementation and test milestones without changing confirmed thresholds.
13. **Health events at zero HP:** order of application, validity of public and private healing; in a hospital,
    0 HP can still receive care without moving.

## 10. Technical plan by stages and initial backlog

- **Stage 0 · Foundations and documentation:** monorepo, domain contracts, migrations, environments and CI;
  catalog of versioned configurable rules; RBAC/ABAC authorization; logging and tracing, deterministic server
  clock tests, audit. Define the economic event schema, currency codes and immutable rounding. Write invariant
  tests before the UI.
- **Stage 1 · Citizen and economy vertical slice:** sign-up and account; country, region and character;
  inventories, energy, food, civil XP, national GOLD; companies, shifts, wages, extraction, manufacturing,
  market orders, buying and selling. End-to-end demo: a citizen works → produces a kit → sells → another
  citizen buys → consumes → consistent ledger and audit.
- **Stage 2 · Government and finance:** parties, candidacies, electoral calendar job, voting and D'Hondt;
  Congress, laws, budget reservations, Treasury, institutional accounts, offices and succession, Central Bank FX
  and authorizations. Demo: Congress approves a budget → funds go to Health → the minister buys kits with a public
  order → the hospital receives stock.
- **Stage 3 · Health and military progression:** training centers, strength, XP and ranks, equipment and uses,
  injuries, kits, hospitals, stock privacy, access policy. Demo: a player trains → ranks up → is injured → uses a
  kit or a hospital → exact inventory and XP records.
- **Stage 4 · Conflict, diplomacy and persistent world:** independence war, government transition; wars, rounds,
  ties, military orders, enemy country, resistance, territories, alliances, embargoes, travel and geographic
  presence. Demo: war law with GOLD escrow → the president launches an offensive → 5/9 rounds → annexation →
  immediate resistance with 10 organizers, 20 GOLD burned and rewards.
- **Stage 5 · Hardening and launch:** anti-abuse, rate limits, multi-account detection, anomalous balances,
  incident reversal with compensating ledger entries, concurrent load tests, authorization security, economic
  integrity, instrumentation and observability, accessibility, backups and restore drills, closed beta and
  balance telemetry.

**Technical priority:** transactional economy and identity before military; without a reliable ledger it is not
safe to enable markets, GOLD issuance or law reservations.

## 11. Main acceptance criteria

- Rising from Novice to Militia I requires 100 total military XP; the second step 400; General V 562,500. After
  that XP and strength keep accumulating without further rank bonus.
- Attacking with 10 energy spends 10; the attack happens even if energy ends at 0, and the matching injury
  probability applies. Damage and XP are confirmed before the injury.
- Regional war without target HP: every valid attack adds in full to the score; civil and military XP = damage
  with additive bonuses (+60 % maximum for enemy + order).
- An N2 hospital can use Q1 and Q2 but never Q3; with 97 HP and a Q5 kit in an N5 hospital, the Q5 disappears and
  HP reaches 100, not 122.
- Cancelling or expiring an authorized war without an attack restores the 50 GOLD exactly once; a war actually
  started burns the 50 GOLD exactly once.
- Changing a minister does not alter balances or inventories; a vacant ministry cannot exercise its powers.
  No automatic return at the end of a term.
- A budget or buy order with locked money cannot be spent in another transaction; consistent rollback on failure.
- Ministerial financial audit is public, but the detailed health stock is only accessible to the Health and
  Presidency roles.

## 12. Detailed engineering plan

### 12.1 Architectural principles

- Initial modular monolith with domain contracts, PostgreSQL as the single source of truth, ACID transactions
  for balance, ownership and XP changes.
- Every mutating action receives an `idempotency_key`; retrying the same request returns the original result
  without duplicating damage, rewards, purchases or votes.
- External events are published from a persistent `outbox` after commit; retryable workers with idempotent
  consumers. Redis never stores the authoritative balance.
- Server clock and business events are UTC. Timed features (votes, rounds, energy, inactivity) use persisted
  timestamps and reconciliation after outages.
- Every balance formula and its revisions carry a version attached to each event, so historical results can be
  rebuilt.
- Separate publicly auditable data (ministerial money, laws, elections) from restricted data (detailed health
  stock, account security, anti-fraud telemetry).

### 12.2 Packages and module boundaries

| Context | Main responsibility | Critical integrations |
| --- | --- | --- |
| identity-access | Users, sessions, optional 2FA, permissions and security | Citizenship, institutions |
| world-citizens | Countries, regions, citizenship, location, energy, health | Work, war, hospitals |
| politics | Parties, candidacies, votes, offices and succession | Laws, permissions, rewards |
| legislation | Bills, quorum, votes, reservations, legal execution | Treasury, war, banking, public policy |
| ledger-treasury | Balances of every currency, issuance, burning, escrow | Market, governments, rewards |
| market-fx | Orders, matching, partial fills, taxes, currencies | Ledger, inventories, trade |
| industry-work | Companies, resources, contracts, shifts, production | Inventories, market, citizen |
| military | Strength, ranks, weapons, wars, rounds, injuries and XP | Health, diplomacy, map, ledger |
| healthcare | Hospitals, supplies, treatments, policies | Inventories, budget, location |
| diplomacy | Alliances, embargoes, enemies, international relations | War, trade, institutions |
| audit-risk | Public and private audit, alerts, anti-fraud and moderation | Every domain |

### 12.3 Initial relational model

Identity (`users`, `sessions`, `login_events`, `characters`, `user_security_events`, `idempotency_keys`); world
(`countries`, `regions`, `region_ownership_history`, `region_resources`, `citizenships`, `citizenship_requests`,
`travel_events`); government (`political_parties`, `party_memberships`, `elections`, `election_snapshots`,
`candidates`, `party_lists`, `ballots`, `vote_records`, `seats`, `appointments`, `succession_events`,
`ministerial_policies`); laws (`bills`, `bill_votes`, `bill_budget_reservations`, `laws`, `law_execution_steps`,
`government_decrees`, `impeachments`); money (`currencies`, `accounts`, `account_balances`, `ledger_transactions`,
`ledger_postings`, `holds`, `issuance_events`, `burn_events`, `public_spending_records`,
`central_bank_permissions`); market (`market_access_licenses`, `market_orders`, `market_matches`, `market_trades`,
`fx_orders`, `export_tax_rules`, `embargo_rules`); production (`companies`, `ownership_history`,
`company_upgrades`, `job_offers`, `employment_contracts`, `work_shift_authorizations`, `work_events`,
`production_events`, `raw_material_stocks`, `exploration_campaigns`); inventories (`inventory_owners`,
`inventory_lots`, `inventory_movements`, `equipments`, `weapon_use_events`); war (`military_profiles`,
`training_centers`, `training_events`, `wars`, `battles`, `rounds`, `attack_events`, `priority_battle_orders`,
`resistance_campaigns`, `resistance_organizers`); health (`hospitals`, `hospital_upgrades`, `hospital_stocks`,
`treatments`, `injuries`, `health_policies`); infrastructure (`outbox_events`, `worker_jobs`,
`public_audit_log`, `restricted_audit_log`, `fraud_signals`, `balance_config_versions`).

**Decisive indexes and constraints:** unique vote per election and citizen; one active incompatible national
office per citizen; one active battle per region; one daily session per center and player; no double reward per
level, rank or resistance campaign; non-negative balances and inventories; unique idempotency keys and
correlated money movements.

### 12.4 API contracts v0.1 (first functional vertical)

Sign-up with transactional creation of the initial character; the citizen's state (level, HP, energy, money,
country); regions with resources, owner and access; personal inventory and weapons; creating companies after
checking cost, region and level; running a shift that pays the wage and credits output atomically; the public
order book; posting orders that reserve goods or money; cancelling the remainder and releasing reservations; the
account statement; one training session per day; atomic attacks with damage, XP, consumption and injury;
hospital treatments consuming a compatible kit; the public log of ministerial money movements. Every financial,
combat or reward action requires an idempotency key and concurrency control. Hospital inventories are never
exposed to citizens without permission.

### 12.5 Mandatory state machines

- Bill: `DRAFT → PRESENTED → VOTING → APPROVED/REJECTED → EXECUTED` (or `APPROVED_NOT_EXECUTED` with consistent
  compensation). Funds locked from PRESENTED.
- Market order: `OPEN → PARTIAL → FILLED/CANCELLED/EXPIRED`; the accounting reservation follows the remaining
  quantity.
- Authorized war: `PROPOSED → APPROVED_PENDING_ATTACK → STARTED/EXPIRED`; GOLD refunded if it expires; burned
  irreversibly if it starts.
- Battle: `SCHEDULED → ROUND_1…ROUND_9 → FINISHED`; the first side with five rounds ends it early.
- Election: `REGISTRATION → VOTING → VALIDATION → PROCLAMATION/INCIDENT`, never allowing double voting or
  editing the snapshot.
- Treatment: `REQUESTED → VALIDATED → CONSUMED_AND_HEALED` atomically; never debit a kit without confirmed
  healing.

### 12.6 Security and abuse

Secure sessions, controlled renewal, CSRF protection where relevant, HttpOnly/Secure/SameSite cookies, limits per
IP, account and device, encrypted secrets, privileged account management and extra verification for high-impact
authorities. RBAC + ABAC (institutional role, country, term, eligibility, company ownership, location, battle
state); never trust flags sent by the frontend. Public, immutable financial log; anti-fraud data and hospital
stock with least privilege; devices, IPs and sensitive metadata never published. Protection against double
spending, duplicated orders, overdrafts, attack replay, resistance reward farming, multi-account abuse,
self-trading and price or FX manipulation: detect and alert; confirmed rules are never changed silently.
Recovery: automatic backups, PostgreSQL PITR, verified periodic restores, financial reversal by compensating
entries. Server-side audited randomness for injuries and exploration, with tamper-proof records; exploration
stays disabled until its parameters exist.

### 12.7 Quality, observability and operation

Unit tests for formulas; property-based tests for ledger and stock; transactional integration; end-to-end
chains; load tests of simultaneous battles; automated security and accessibility tests. Monitoring: traces per
request and event, queue metrics, SQL locks, matching time, GOLD issuance and burn ratios, market prices,
ownership concentration, XP per attack, economic survival of small countries. Structured logs correlated by
`request_id`, `event_id` and `transaction_id`; alerts on negative balances, inconsistent reservations, several
holders of one office or repeated rewards. UI: desktop-first responsive with a mobile experience, role-based
navigation, Spanish interface, future translations without mixing content language and code language.
Documentation: OpenAPI, C4 diagrams and state models, ADRs, versioned rules, reversible migrations and changelog.

### 12.8 Epic backlog and Definition of Done

| Priority | Epic | Verifiable deliverable |
| --- | --- | --- |
| P0 | Identity and countries | Sign-up creates the player and starting balances exactly once |
| P0 | Ledger and currencies | Double entry, escrows, mint and burn, money serialization and audit |
| P0 | Inventories and stock | Atomic movements, quality, origin and non-negativity |
| P0 | Market | Partial orders, taxes and cancellations with correct funds |
| P1 | Companies and work | Shifts, wages, production, limits and raw materials |
| P1 | Government and laws | Elections, votes, offices, laws, allocations and refunds |
| P1 | Health and training | Kits, hospitals, training, injuries and recovery |
| P2 | War and diplomacy | Combat, orders, annexation, resistances, alliances and embargoes |
| P2 | Anti-fraud and operations | Alerts, observability, restore and balance simulation |

**Definition of Done for every epic:** clear user story and acceptance criteria; versioned data model;
documented API; unit and integration tests; reviewed authorization; auditable events; concurrency and retries
tested; reasonable accessibility; main metrics and alerts; reproducible deployment and documented rollback.

## 13. Open decisions and launch risks

| Id | Item | Status | Development treatment |
| --- | --- | --- | --- |
| PD-01 | Price and probability of the 7-day regional exploration | Explicitly pending | Feature flag off until values arrive |
| PD-02 | Requirements, damage target and powers of the Liberating Hero | Pending | Only a preparatory or sandbox mode; no definitive founding |
| PD-03 | Requirements and exact cost of travel and foreign market licenses | Pending | Contracts and configuration, no final prices |
| PD-04 | Exact activity threshold for the national resource bonus | Pending | Measure availability and production per a rule documented in `balance_config` |
| PD-05 | Reference wage for companies without history | Pending | Require a fallback rule before enabling expropriation in that case |
| PD-06 | Access calendar of small countries and absolute ties by seniority | Assumption | Final tie-break by stable id; electoral test |
| PD-07 | Exceptional succession procedure without eligible citizens | Assumption | Deterministic, auditable algorithm subject to a normative definition |
| PD-08 | Automatic food selection and excess energy | Assumption | Consume only on a deficit; visible, configurable rule |
| PD-09 | Hospital quality selection when no kit suffices | Assumption | Heal partially with the best available quality within the limit; 1 kit per action |
| PD-10 | Exact boundary of private access to health stock and public purchases | Permission definition | Publish money, restrict quantities and detailed stock |
| PD-11 | Inflationary abuse by repeatable resistances and level rewards | Accepted risk | Telemetry, simulations and anti-fraud; no caps without authorization |
| PD-12 | Simultaneous load of battles, market and energy updates | Scale risk | Load tests, idempotent jobs and locks or partitions where needed |
| PD-13 | Laws with irreversible execution in external providers | Transactional risk | Sagas with compensation; never promise instant distributed rollback |
| PD-14 | Terms and conditions, moderation, privacy and user age | Product and legal pending | Prepare texts, policies and report flows before a public beta |
| PD-15 | Tutorial, retention, onboarding and accessibility | UX pending | Design and test in the vertical slice, not after launch |

## 14. Balance simulations before a beta

Simulate small, medium and large populations, new and veteran citizens, unequal strength and wealth, and
different attendance patterns. Check the combat loop (1 damage = 1 military and civil XP, additive bonuses up to
+60 %, ranks capped at General V, unlimited strength), time to reach civil levels and GOLD issued per war
session. Measure the GOLD economy (inflows from levels, elected officials and resistance against burns from
parties, elections, training, firms and wars). Simulate thin markets, large state purchases, export taxes from
0 to 100 %, embargoes and blocked orders. Simulate N1–N5 hospitals with Q1–Q5 kits and military campaigns
(stockout rate and budget). Simulate elections with `A < 50`, the minimum Congress of 8, incomplete lists, ties,
quorum, vacancies and chained successions.

## 15. Suggested first four sprints

- **Sprint 0 (foundations):** repository, pnpm monorepo, TypeScript standards, local PostgreSQL, migrations,
  lint/test/CI, OpenAPI, versioned rule catalog, permission policy and audit matrix.
- **Sprint 1 (identity and ledger):** users and characters, countries and regions, starting grant of 5 GOLD, 100
  currency and 10 Q1 food, double-entry accounts and ledger, transactions, idempotency, energy and HP, first
  endpoints.
- **Sprint 2 (inventory, jobs, production):** stock and movements, N1 companies, jobs, shifts and wages, Q1
  extraction and manufacturing with inputs, rounding and process audit; concurrency tests.
- **Sprint 3 (market and first playable experience):** posting and partial purchases, tax settlement, goods and
  funds deposits, work and market UI, use of kits and food, E2E tests and an integrated demo.

**Criterion to start the next phase:** a citizen signs up, receives the starting wealth, works, produces, posts,
sells, buys and uses a consumable; no double spending or lost stock under errors or concurrency.

**Editorial close.** This document consolidates the project's known decisions up to 12-10-2026. It does not
present as confirmed the values not explicitly provided. The technical plan is an implementable proposal,
reviewable through ADRs, without new rounds of questionnaires.
