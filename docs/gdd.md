# Concordia · Game design document

Oct 7, 2026 · @Nacho · English translation of the original Spanish document (October 9, 2026).
Where this document and `docs/brief.md` section 3 disagree, the brief wins. Each rule is updated here in the
PR that implements it.

## How to use this document

Concordia is documented in 12 modules that we complete one at a time. Each module answers one question,
collects what the sketches already proposed and shows what is still open.

| Module | Question it answers | Status |
| --- | --- | --- |
| 1 · Game vision | What game is it, who is it for and what makes it different? | Not started |
| 2 · World and time | Where does everything happen and how does time pass? | Draft |
| 3 · Citizen and progression | Who is the player and how do they grow? | Not started |
| 4 · Economy | How is value produced, earned and spent? | Not started |
| 5 · Politics | Who decides the rules of each country? | Not started |
| 6 · War and conquest | How does a region change hands? | Not started |
| 7 · Society and press | How do players communicate and organize? | Not started |
| 8 · Daily loop and retention | Why does the player come back tomorrow? | Not started |
| 9 · Monetization | How does the game pay for itself without pay-to-win? | Not started |
| 10 · Interface and experience | How does the player see and operate all this? | Draft |
| 11 · Technology and fair play | How does it run, scale and protect itself from cheating? | Not started |
| 12 · Balance, metrics and glossary | Which numbers do we tune and how do we know it works? | Not started |

Suggested order: 1, 2, 3 and 4 first, because they set the rules every other module uses. Then 6 and 5,
which depend on the economy. 9 and 12 close at the end, when there are numbers to balance.

## 1 · Game vision

Concordia is a persistent multiplayer strategy game for the browser, where citizens of real countries work,
vote and fight for territory. This module sets the tone for all the others.

**Includes**

- One-sentence concept and value proposition
- Design pillars: the 3 or 4 ideas that decide when in doubt
- Target audience and playing time per day
- Platforms: desktop and mobile web
- References (eRepublik and others) and how we differ

**Already proposed**

- A world with real countries and regions; each country has a color and conquered regions take the
  conqueror's color.
- Three spheres of play: economy, politics and war.

**Open**

- [ ] Are countries real with their real names, or fictional on the real map?
- [ ] How long is a typical session: 10 minutes a day or more?
- [ ] Are there seasons that reset the world, or a single permanent world?
- [ ] Design pillars

## 2 · World and time

The world is a world map of 250 countries and 4,594 regions, and every region has an owner that can change.
This module sets what each region is worth and how the game clock moves.

**Includes**

- Countries: which are playable, capital, color, starting population
- Regions: borders, neighbors, resources and what controlling them gives
- Borders and adjacency: which regions can be attacked from where
- The game day: cutoff time, energy recharge, market and election closings
- What happens to a country that loses all its regions

**Already proposed**

- Natural Earth borders (public domain), with colors that do not repeat between neighbors.
- Argentina light blue and Spain red; a conquered region takes the conqueror's color.
- Interactive map on the landing, with search and zoom.
- Participating countries: the admin panel chooses which countries are part of the world. The rest show in
  gray on the map, locked and without interaction.
- Disputed territories (for example, the Falklands/Malvinas): disabled by default, gray like the countries
  that do not participate. The panel can enable them.
- Starting territories of each country: defined later.
- Game time: GMT−3 for everyone. The game day changes at 00:00 GMT−3.

**Regionalization**

Every country uses the same region level: a region is a group of complete neighboring provinces or states,
and no country plays with its individual provinces. With this criterion the world goes from 4,594 provinces
to about 820 regions.

- The number of regions of each country comes from the same formula for everyone, with a minimum of 3 and a
  maximum of 12:

```latex
\text{Regions} = \operatorname{round}\left(\frac{\sqrt{\text{Area in km}^2}}{500} + \frac{\sqrt{\text{Population in millions}}}{2.5}\right)
```

- If the country has an official regionalization with a similar count (up to 3 regions apart), that one is
  used. It is the same principle as the European Union NUTS regions: start from existing administrative
  divisions and look for regions of comparable size ([Eurostat](https://ec.europa.eu/eurostat/web/nuts/principles)).
- If it does not, neighboring provinces are grouped looking for regions of similar population and area.
- A country with fewer provinces than the minimum keeps the ones it has; they are almost all microstates or
  islands.
- The team reviews and can correct each grouping in the admin panel before enabling the country.

Each region carries its own geographic or historical name, never just a compass point: «Grão-Pará» instead
of «North», «Mezzogiorno» instead of «South».

Regions of the 13 countries in play today (78 in total):

| Country | Provinces or states | By the formula | Regions on the map | Grouping used |
| --- | --- | --- | --- | --- |
| Brazil | 27 | 12 | 12 | Neighboring states within the 5 large IBGE regions |
| United States | 51 | 12 | 9 | The 9 census divisions |
| Mexico | 33 | 7 | 7 | Neighboring states |
| Spain | 52 | 4 | 7 | NUTS 1 |
| Argentina | 24 | 6 | 6 | Interprovincial regions, with the Norte Grande split in two |
| Canada | 13 | 9 | 6 | Usual grouping of provinces and territories |
| France | 101 | 5 | 6 | Neighboring administrative regions, plus Overseas |
| Chile | 16 | 3 | 5 | Macrozones |
| Italy | 110 | 4 | 5 | NUTS 1 |
| Germany | 16 | 5 | 5 | Neighboring federal states |
| United Kingdom | 232 | 4 | 4 | Its four nations |
| Paraguay | 18 | 3 | 3 | Chaco and the Eastern Region split in two |
| Portugal | 20 | 3 | 3 | NUTS 1 |

Region names are proper names and keep their in-game spelling in every language:

| Country | Region names |
| --- | --- |
| Argentina | Buenos Aires · Córdoba y el Litoral · Norte Andino · Gran Chaco y Misiones · Cuyo · Patagonia |
| Brazil | Alto Amazonas · Grão-Pará · Acre y Rondônia · Meio-Norte · Ceará y Borborema · Pernambuco y São Francisco · Bahía · Planalto Central y Pantanal · Minas Gerais · São Paulo · Rio de Janeiro y Espírito Santo · Pampa Gaúcha y Paraná |
| Chile | Norte Grande · Norte Chico · Valle Central · Biobío y Los Lagos · Patagonia Chilena |
| Paraguay | Chaco Paraguayo · Alto Paraná y Amambay · Asunción e Itapúa |
| Mexico | Sonora y las Californias · Chihuahua y Durango · Sierra Madre Oriental · Jalisco y Michoacán · Valle de México y el Bajío · Oaxaca y Chiapas · Yucatán y el Golfo |
| United States | Nueva Inglaterra · Atlántico Medio · Grandes Lagos · Grandes Llanuras · Carolinas y Florida · Tennessee y Misisipi · Texas y Luisiana · Montañas Rocosas · Pacífico y Alaska |
| Canada | Provincias Atlánticas · Quebec · Ontario · Praderas · Columbia Británica · Yukón y el Ártico |
| Spain | Galicia y el Cantábrico · País Vasco y el Ebro · Madrid · Castillas y Extremadura · Cataluña y Levante · Andalucía y Murcia · Canarias |
| Italy | Lombardía y Piamonte · Véneto y Emilia · Toscana y Lacio · Mezzogiorno · Sicilia y Cerdeña |
| Portugal | Portugal Continental · Azores · Madeira |
| Germany | Mar del Norte y Báltico · Renania del Norte-Westfalia · Valle del Rin · Berlín y Sajonia · Baviera |
| France | París y el Canal · Bretaña y Loira · Alsacia y Borgoña · Aquitania y Occitania · Ródano y Provenza · Francia de Ultramar |
| United Kingdom | Inglaterra · Escocia · Gales · Irlanda del Norte |

Mendoza is inside Cuyo, so the landing example is «Spain conquers Cuyo».

**Open**

- [x] Are all 4,594 regions playable, or do we group those of countries with many (the United Kingdom has
  232)? They are compacted into regions, with the same criterion for every country.
- [x] Are islands and regions without a land border attacked by sea? Yes, by air or by sea (see module 6).
- [x] Disputed territories (for example, the Falklands/Malvinas): whose are they at the start? They are
  disabled by default.
- [x] Resources per region and their distribution: each region has its real resources (see module 4)
- [x] Game day cutoff time and time zone: GMT−3 for the whole game

* [ ] Starting territories of each country
* [ ] Review the region grouping of each enabled country

## 3 · Citizen and progression

The player is a citizen of a country, and energy is the resource that limits everything they do each day.
This module defines their attributes and how they grow.

**Includes**

- Sign-up: choose a name and citizenship
- Attributes: level, experience, energy, well-being, strength, rank, influence
- Energy recharge and how to recover faster
- Level curve and what each level unlocks
- Citizenship change and migration between countries
- Personal inventory

**Already proposed (sample values from the sketches)**

| Attribute | Sample value |
| --- | --- |
| Energy | 84 of 100; each action costs 10 |
| Experience | 6,420 of 8,000 for level 28 |
| Level | 27 · rank Captain |
| Strength | 1,840 |
| Well-being | 92 of 100 |
| Influence | 340 |

**Citizenship**

> Superseded by `docs/brief.md` section 3: citizenship is immediate at sign-up, with a 7-day adaptation
> period, a waitlist for countries not in play, and later changes approved automatically after 72 hours.
> The text below is the original proposal, kept for the admission criteria table.

Every citizenship is approved by the country's Interior minister or president, and each country sets the
admission criteria by law.

- The request is answered within 72 hours. If nobody answers, a new player's first citizenship is approved
  automatically, so an inactive government does not hold back newcomers. A citizenship change with no answer
  is rejected.
- While waiting, the player is a resident: they can work and train, but cannot vote, run for office or hold
  office. In battles they can only join as a volunteer.
- A player can change citizenship at most once every 30 days. On changing, they lose their offices and their
  party membership.

Criteria each country sets by law:

| Criterion | Options | Initial value |
| --- | --- | --- |
| Admission mode | Review by the minister · Automatic · Closed | Review by the minister |
| Applicant minimum level | 0 to 30 | 0 |
| Minimum account age | 0 to 60 days | 0 |
| Citizens of countries at war with ours | Admitted · Not admitted | Not admitted |
| Quota of new citizenships per day | No quota, or 1 to 500 | No quota |
| Naturalization fee (goes to the treasury) | 0 to 500 Credit | 0 |
| Wait to vote and run for office | 0 to 30 days | 7 days |

The voting wait and the daily quota protect the country from a political takeover: players from another
country naturalizing en masse to win an election.

**Open**

- [x] Energy recharge rate: 10 per hour, maximum 100 (see module 6)
- [ ] What does well-being do? Does it affect energy or productivity?
- [ ] Difference between level and military rank
- [x] Rules and cost of changing citizenship: see Citizenship

## 4 · Economy

Players make the economy: they produce in companies, sell on the market and pay taxes to their country. It
is the hardest module to balance and should close before war.

**Includes**

- Currencies: Gold (shared by the whole world) and Credit (each country's currency, or a single one)
- Work and wages
- Companies: types, creation, employees, production
- Raw materials and products: wheat, iron, oil and what is made from them
- Market: buying, selling, prices and currency exchange
- Taxes and the national treasury
- Where money comes from and where it goes (sources and sinks)

**Already proposed (sample values from the sketches)**

- Working costs 10 energy; the reference wage is 42 Credit.
- Work tax of 12 %.
- Sample prices: wheat 4.20 · iron 7.85 · oil 12.10.
- Each country has a central bank run by the Finance minister. It can only transfer between official accounts.
- Congress can open tenders for private banks. Players run them, leaving enough resources as collateral.
- A private bank grants loans to players and pays interest on its deposits.
- Players can form partnerships with each other.

### Proposed balance: economy

All value comes from work: a workday is worth 10 production points, and launch prices derive from a
reference wage of 42 Credit.

**Currencies**

- Gold is the only global currency and the only one the game creates. It is earned with missions, levels and
  medals, and bought with real money.
- Each country has its local currency (Credit, with the country code). Only the issuance law creates it:
  Congress approves an amount and the treasury pays 1 Gold for every 100 Credit issued.
- Gold and local currencies are exchanged on a player market, at a free price. The central bank does not
  take part.
- A new citizen receives 5 Gold and 50 Credit of their country.

**Work**

- Each player works once per day: it costs 10 energy and contributes 10 production points to the company.
- The company owner sets the wage. Congress can set a minimum wage by law.
- Whoever works in their own company earns no wage: the production stays with them.

**Products**

> `docs/brief.md` section 3 updates the recipes: ration = 1 wheat + 2 work points; fuel = 1 oil + 0.5 points.

| Product | Inputs per unit | Units per workday | Used for | Launch price (Credit) |
| --- | --- | --- | --- | --- |
| Wheat | — | 10 | Rations | 4.20 |
| Iron | — | 5 | Weapons | 8.40 |
| Oil | — | 4 | Fuel | 10.50 |
| Ration | 2 wheat + 1 production point | 10 | +10 energy | 12.60 |
| Weapon Q1 to Q5 | Q iron + Q production points | 10 ÷ Q | Damage ×(1 + 0.2 × Q) on one hit | 12.60 × Q |
| Fuel | 1 oil + 0.5 production points | 20 | Opening battles (module 6) | 12.60 |

The launch price is the cost of the inputs at the reference wage; afterwards the market moves it. Every
weapon quality costs the same per point of extra damage, but a Q5 yields more per energy, which is what is
scarce.

**Resources per region**

Each region has the resources it has in reality, and a country only benefits from them if it invests in
exploring and maintaining them.

- The game's three resources group the real ones: wheat covers cereals (wheat, corn, rice, soy), iron covers
  metallic minerals and oil covers oil and gas.
- Each region has a deposit of level 0 to 3 per resource, according to its real production compared to the
  rest of the world: 0 has none and 3 is among the largest producers. It is computed once, when the map is
  built.
- A deposit goes through three states: unexplored, under exploration and in production.
- Exploration is ordered by the president or the Finance minister, only in their own regions. It costs
  2,000 treasury Credit per deposit level, takes 3 days, and that money leaves the game.
- Keeping a deposit in production costs 50 Credit per level per day. If the treasury does not pay, the
  deposit is paused.
- Nationwide production of each raw material is 50 % plus 15 % per level in production, up to 150 %. A
  level 2 deposit takes it to 80 %; two level 3 deposits, to 140 %.
- If a region is conquered, its deposits pass to the conqueror paused, and reactivating them costs half the
  exploration.
- Trade between countries: a country can lease a producing deposit to another for a daily price. While the
  contract lasts, that level counts for the buyer and not for the seller. The president or Finance minister
  of each country signs it; if it lasts more than 30 days, each Congress also approves it. Payment leaves the
  buyer's treasury every day, and if there are no funds the contract is suspended.
- Raw materials themselves keep being bought and sold between players on the market, with tariffs.

Data sources to evaluate for the levels (license, coverage and date still to review for each): crops from
[MapSPAM, by IFPRI](https://www.ifpri.org/blog/webinar-launching-spam2020-latest-innovation-global-crop-mapping/),
oil and gas from the [Global Energy Monitor extraction tracker](https://www.gem.wiki/Global_Gas_and_Oil_Extraction_Tracker_Methodology)
and minerals from the [USGS MRDS system](https://www.usgs.gov/publications/mineral-resources-data-system-mrds).

**Companies**

| Action | Cost (Gold) |
| --- | --- |
| Create a raw material company | 20 |
| Create a factory | 40 |
| Upgrade to level 2 (from 10 to 20 employees) | 30 |
| Upgrade to level 3 (up to 40 employees) | 60 |
| Raise a weapons factory's quality from Q to Q+1 | 20 × Q |

**Taxes**

| Tax | Charged on | Legal range | Initial value |
| --- | --- | --- | --- |
| Work | The wage | 0 to 30 % | 12 % |
| Value added | Sales on the country's market | 0 to 25 % | 5 % |
| Tariff | Sales by foreign companies | 0 to 50 % | 10 % |

Everything goes to the national treasury. At launch prices, a country with 500 active players collects about
4,250 Credit per day.

**Private banks**

> `docs/brief.md` section 3 replaces the auction by a tender with 2 licenses per round and a scoring formula.

- Congress opens the tender and the highest collateral wins, with a minimum of 500 Gold.
- A bank can take deposits up to 5 times the value of its collateral.
- Each bank sets its rates. The law sets a maximum loan rate; the initial one is 3 % per week.
- Loans for 7, 14 or 30 days, for up to 30 times the borrower's average wage over the last 7 days.
- If a player does not pay, their balance is deducted and 50 % of each wage until the debt is covered.
  Meanwhile they cannot ask for another loan.
- If a bank cannot return deposits, its collateral is split among depositors and it loses its license.

**Partnerships**

- From 2 to 5 partners, each with an ownership percentage.
- The partnership can own companies, and profits are split by ownership.
- Debts belong to the partnership: partners are not liable with their personal money.

**Official accounts**

- National treasury, one account per ministry, the budget of each field hospital and the national depot of
  fuel and weapons.
- Only the central bank moves money between them, by order of the Finance minister.

**Against inflation**

- Gold that leaves the game: creating and upgrading companies, advanced training, currency issuance,
  creating parties and newspapers, starting resistances.
- Local currency that leaves the game: a 1 % fee on every market sale, the budget hospitals consume and what
  exploring and maintaining deposits costs.
- Rations, weapons and fuel are destroyed when used.
- Gold that comes in: 1 for completing the daily missions, 3 extra for 7 days in a row, 3 per level and 2 per
  battle medal. According to the calculation, about 1.7 Gold come in per active player per day and 1.25 leave.

### To validate in testing

- [ ] That the real wage stays close to the reference (42 Credit)
- [ ] That no raw material ends up without demand or with a permanent surplus
- [ ] That the minimum collateral of 500 Gold does not leave banks only in the hands of the richest players
- [ ] That net Gold stays between 0 and +0.5 per active player per day (see module 12)

## 5 · Politics

Each country is governed by its own players, who elect a president and Congress and vote on laws. This
module defines the offices, the terms and what each one can change.

> `docs/brief.md` section 3 sets who votes laws (only the 20 members of Congress, 24 hours, vice president
> breaks ties within 12 hours, the president never votes) and who proposes them.

**Includes**

- Parties: creating, joining, leader
- Elections: president and Congress, frequency, who can vote and run
- Laws: which types exist (taxes, tariffs, declaring war, peace, budget)
- Powers of the president and of Congress
- Diplomacy: alliances, treaties, embargoes

**Already proposed**

- Presidential election every 30 days.
- Congressional election every 30 days, 15 days after the presidential one: there is an election every 15
  days, alternating president and Congress.
- The president appoints the vice president, ministers and ambassadors.
- Ministries already mentioned: War (module 6), Finance (module 4) and Interior, which approves citizenships
  (module 3).
- Law voting with a closing time (example: Agricultural tariffs law, closes in 14 h).
- The president's name shows on the country panel.

**Open**

- [ ] Which ministries exist besides War, Finance and Interior, and what each one can do
- [ ] What an ambassador does
- [x] Who declares war: the president proposes and Congress approves by simple majority (see module 6)
- [ ] How many votes or what percentage passes a law
- [ ] What can be voted without being a party member

## 6 · War and conquest

Regions change hands by winning battles, and a battle is won by adding up the damage of every citizen on
each side. It is the core that makes the game visible on the map.

**Includes**

- Declaring war and opening a battle for a neighboring region
- Rounds, duration and how the winner is decided
- Damage formula: strength, rank, weapons, bonuses
- Military units: groups of players with a leader
- Who can fight for each side (citizens, allies, mercenaries)
- Resistance: how a country recovers an occupied region

**Already proposed (sample values from the sketches)**

- Battle by rounds, with a dominance scoreboard (example: round 3 of 5, Valdoria 58 % against Karelia 42 %).
- Each hit costs 10 energy and gives +1 experience.
- Training costs 10 energy and gives +10 strength.
- On winning, the region takes the conqueror's color and the border moves.
- A region without a land border with the attacker can be attacked by air or by sea.
- A naval attack needs available coast: the attacking country must administer at that moment at least one
  region with sea access. If it has none, or all its coastal regions are occupied by another country, it
  cannot launch naval attacks.
- Field hospitals: the president or the War minister installs them in regions at war and assigns them a
  budget. Players recover energy there; each use consumes part of the budget and the hospital works until it
  runs out.

### Proposed balance: war

Energy is what limits war: each hit costs 10, and nobody can land more than 52 hits per day.

**Energy** (also defined in module 3)

- Maximum 100. Recharges 10 per hour.
- Rations recover up to 200 per day, and field hospitals up to 100 more.
- Someone who logs in twice a day collects about 200 of recharge. The absolute ceiling is 540 energy: 52 hits
  after working and training.

**Declaring war** (also defined in module 5)

- The president proposes the law and Congress approves it by simple majority.
- The war continues until peace is signed, which both countries' Congresses must approve.

**Opening a battle**

| Type | Region that can be attacked | Requirement | Fuel from the national depot | Attacker damage |
| --- | --- | --- | --- | --- |
| Land | Bordering a region the attacker administers | — | 200 | 100 % |
| Naval | Any enemy region with sea access | Available coast | 800 | 90 % |
| Air | Any enemy region within 1,500 km of a region of the attacker | — | 1,500 | 90 % |

- The president or the War minister opens it. A country can have 2 offensive battles open at once;
  defensive ones, unlimited.
- A region that resisted an attack cannot be attacked again by the same country for 24 hours.
- For a country of 500 active players, a land attack costs half a day of tax revenue, a naval one 2.4 days and
  an air one 4.4 days.

**Rounds**

- Each round lasts 4 hours, and the side that dealt more damage in it wins it.
- The battle goes to whoever first wins 3 rounds: at most 5 rounds and 20 hours, so each battle covers a day
  in any time zone.
- If the attacker wins, the region changes hands when the battle closes.

**Damage per hit**

```latex
\text{Damage} = 50 \times \left(1 + \frac{\sqrt{\text{Strength}}}{10}\right) \times (1 + 0.03 \times \text{Rank}) \times \text{Weapon} \times \text{Bonuses}
```

- Weapon: ×1 without a weapon, from ×1.2 to ×2.0 depending on quality. One weapon is spent per hit.
- The square root of strength slows down the veterans' advantage: at the maximum, a veteran hits about 13
  times harder than a new player.

| Profile | Strength | Rank | Weapon | Damage per hit |
| --- | --- | --- | --- | --- |
| New, day 1 | 100 | 0 | Q1 | 120 |
| 1 month | 550 | 3 | Q2 | 255 |
| 6 months | 1,840 | 12 | Q3 | 576 |
| 1 year, maxed out | 7,400 | 20 | Q5 | 1,536 |

**Bonuses and who fights**

- Defense: +10 % for the country that administers the region.
- Resistance: +10 % for the region's country of origin, if it is occupied today.
- Citizens of both countries and of their treaty allies fight. Any other player can join as a volunteer,
  with −25 % damage.

**Training, experience and rank**

- Training: once per day, 10 energy, +10 strength. Advanced training gives +20 strength for 1 Gold.
- Rank rises with accumulated damage: reaching rank n needs 10,000 × n² damage. Rank 12 needs 1.44 million,
  and the maximum is 20.

**Field hospitals**

- Each use recovers 10 energy and consumes 15 Credit of the budget, which leave the game.
- Any player on the side that installed it can use it, up to 100 energy per day across all hospitals.
- 200 uses cost 3,000 Credit, less than a day of tax revenue for a country of 500 players.

**Rewards**

- Round hero: whoever deals the most damage on each side in each round gets 2 Gold and a medal.

**Country without regions**

- It becomes occupied: its citizens keep their citizenship, but there are no elections or taxes.
- Any citizen can start a resistance in one of its home regions for 20 Gold. It is fought like a normal battle.
- If a country loses its capital, the capital moves to its most populated region.

### To validate in testing

- [ ] That very active players (52 hits per day) do not pull too far ahead of the rest
- [ ] That the air attack is worth its cost compared to the naval one
- [ ] That 4-hour rounds do not feel slow
- [ ] That resistances do not make holding a conquest impossible

## 7 · Society and press

Players organize and debate inside the game, above all through their own newspapers. This module covers
everything that happens between people.

**Includes**

- Newspapers: creating one, publishing articles, subscribers, votes
- Automatic world news (battles, laws, records)
- Private messages, friends and chat per country or unit
- Notifications
- Content moderation and reports

**Already proposed**

- News section on the home screen, with source and age (example: National press, 12 min ago).

**Open**

- [ ] Do articles give influence or money to their author?
- [ ] Languages: one world in Spanish, or several languages in the same world?
- [ ] Moderation rules and who moderates

## 8 · Daily loop and retention

The player comes back every day because energy recharges, there are new missions and their country needs
them in a battle or a vote. This module orders that routine.

**Includes**

- The daily routine: what is done in a session of a few minutes
- Daily and weekly missions, and their rewards
- Achievements and medals
- First days: tutorial and new citizen guide
- Special world events

**Already proposed (sample values from the sketches)**

> `docs/brief.md` section 3 replaces «vote» with «read an article» and «fight» with «land 5 hits».

- Four daily missions: work, train, fight and vote. Completing them gives 1 Gold, and 7 days in a row give 3
  extra Gold (values adjusted for balance, module 4).
- Home screen with "pending matters" and a log of what changed after each action.

**Open**

- [ ] Are the missions always the same or do they change?
- [ ] Tutorial steps
- [ ] What does someone who skips a day lose (if anything)

## 9 · Monetization

The game is funded by selling Gold and conveniences, with a clear limit so that paying does not decide wars.
This module sets what is sold and where that limit is.

**Includes**

- What can be bought with real money: Gold, subscription, cosmetics
- What is never sold
- Prices and packs
- Advertising (if any)

**Open**

- [ ] Can purchased Gold be used to buy energy or weapons?
- [ ] Monthly subscription with perks, or only one-off purchases?
- [ ] Daily spending cap or cap on the advantage from paying

## 10 · Interface and experience

The interface has a first version: a home screen on desktop and mobile, a visual system and a landing with
the map. This module gathers every screen and the visual rules.

> `docs/brief.md` section 3 and the Atlas design system supersede the notes below: Archivo and EB Garamond,
> adaptive desktop web only, and Spanish plus English interface languages.

**Includes**

- Screen map and navigation
- Visual system: typography, colors, spacing, components
- States of each action: normal, loading, success, error, disabled
- Mobile adaptation
- Accessibility

**Already proposed**

- Light base, no dark mode. IBM Plex Sans Condensed for titles and IBM Plex Sans for the rest.
- Red is reserved for the combat action; a single red button per screen.
- Every action shows cost, benefit and result.
- Screens done: home screen (desktop and mobile), state sheet, landing with map.

**Open**

- [ ] Full list of screens per module
- [ ] Own mobile app or adapted web?

## 11 · Technology, operations and fair play

A shared, persistent world needs a server that processes the game day for everyone at once and stops
cheaters. This module describes how it works inside.

**Includes**

- Architecture: web client, server, database
- Game day processes: recharge, production, closing battles and elections
- Shared real-time map state
- Multi-accounts, bots and other cheating: detection and sanctions
- Accounts, security and privacy
- Internal tools for the team (administration, support)

**Already proposed**

- Admin panel for the team, with these functions:
  - Choose which countries take part. The rest stay gray, locked and without interaction on the map.
  - Enable the disputed territories, which start disabled.
  - Review and correct each country's region grouping before enabling it.
  - Assign each country's starting territories (criterion pending, module 2).
- Every game day process runs in GMT−3.

### Infrastructure on a $0 budget

The proposal is Supabase for data, accounts and live battles, and Cloudflare to serve the web and trigger
the scheduled jobs. Both have a free plan without a credit card, and they are enough for a closed beta of a
few hundred daily players.

| Game piece | Service | Key free plan limit |
| --- | --- | --- |
| Game web and map file | Cloudflare Workers, static assets | Static asset requests free and unlimited |
| Scheduled jobs (rounds, game day, elections) | Cloudflare Cron Triggers | 100,000 requests per day and 10 ms of CPU per run |
| Database: economy, politics, war | Supabase Postgres | 500 MB and 5 GB of egress per month |
| Accounts and access | Supabase Auth | 50,000 monthly active users |
| Live battles | Supabase Realtime | 200 concurrent connections and 2 million messages per month |
| Server logic | Postgres functions and Supabase Edge Functions | 500,000 invocations per month |
| Email (verification, notices) | Resend | 3,000 per month and 100 per day |
| Backups | Daily database copy with GitHub Actions | Supabase Free does not include automatic backups |

**Why this combination**

- The economy moves money between players, companies and treasuries, and that calls for real transactions.
  Postgres has them, and every money operation can be a database function that validates and records
  everything together. That also stops cheating, because the browser does not decide balances.
- Supabase brings accounts, real time and the database in a single project, which reduces the pieces to
  maintain.
- Cloudflare serves the map (0.9 MB) and the web at no cost. That way Supabase's monthly egress, the
  tightest limit, is not spent.
- It is standard Postgres: if the game grows or conditions change, the database can move to another provider.

**Rules to stay within the free plan**

- Energy and day changes are computed when the player arrives, from the time of their last action. There is
  no job that walks over every player.
- Damage is stored aggregated per player and per battle, not one record per hit.
- Only the battle screen uses real time. The rest updates when the player does something.
- Scheduled jobs only trigger database functions: closing each round every 4 hours and the day change at
  00:00 GMT−3 (03:00 UTC). Cloudflare's daily limits reset at 00:00 UTC, which is 21:00 in GMT−3.
- The game lives on a free Cloudflare subdomain until there is budget for its own domain, paid yearly.

**When to start paying**

| Signal | Next step | Cost |
| --- | --- | --- |
| Supabase egress close to 5 GB per month, database close to 500 MB or more than 150 players connected at once in battles | Supabase Pro | From US$25 per month |
| More than 100,000 requests per day on Cloudflare | Workers Paid | Minimum US$5 per month |
| Many verification emails per day | Paid Resend plan or verification by other means | To be defined |

**Discarded options**

- Vercel Hobby: it is for personal, non-commercial use only, and the game will have monetization (module 9).
- Neon: its free plan gives 100 compute hours per project per month, and the database suspends after 5
  minutes without use. It does not cover a game that is on 24 hours a day.
- Cloudflare only (D1 and Durable Objects): D1 allows 100,000 rows written per day and free Workers have
  10 ms of CPU per request. It is tight for the economy, and an accounts service would also be missing. It
  stays as an option for live battles if Realtime falls short.
- Oracle Cloud Always Free: the most powerful (2 Arm cores, 12 GB of memory, 200 GB of disk and 10 TB of
  egress per month), but it requires running our own server. Also, Oracle can reclaim a machine that spends 7
  days under 20 % usage, which is exactly what happens before launch. It works as an intermediate step when
  someone is there to maintain it.

**Risks**

- Supabase pauses a free project after a week without activity. It can happen before launch; it is
  reactivated from the dashboard.
- Free plan conditions change. They should be reviewed before opening the game.
- I could not confirm on their pricing pages whether Supabase Cron is included in the free plan, nor the
  commercial use conditions of Cloudflare's free plan. That is why the scheduled jobs stay on Cloudflare Cron
  Triggers.

Sources consulted on October 8, 2026: [Supabase pricing](https://supabase.com/pricing), [Cloudflare Workers pricing](https://developers.cloudflare.com/workers/platform/pricing/), [Cloudflare Workers limits](https://developers.cloudflare.com/workers/platform/limits/), [Durable Objects pricing](https://developers.cloudflare.com/durable-objects/platform/pricing), [D1 pricing](https://developers.cloudflare.com/d1/platform/pricing/), [Vercel Hobby plan](https://vercel.com/docs/plans/hobby), [Neon pricing](https://neon.com/pricing), [Oracle Always Free resources](https://docs.oracle.com/en-us/iaas/Content/FreeTier/resourceref.htm), [Resend pricing](https://resend.com/pricing) and [Supabase Cron](https://supabase.com/docs/guides/cron).

### Technical architecture

The game rules live in the database and the browser only shows and asks: no balance, damage or vote is
computed on the player's computer. Everything is written in TypeScript and SQL.

[embedded content: technical architecture · browser, Cloudflare, Supabase and support]

The browser downloads the app and the map from Cloudflare and asks Supabase for everything else; the
Cloudflare clock triggers the same game functions the player uses.

| Layer | Technology | Why |
| --- | --- | --- |
| Language | TypeScript on the web and in functions; SQL in the database | A single language end to end, with types generated from the database |
| Game web | React with Vite, as a single-page application | The game lives behind the login and does not need its own server for the interface |
| Data on the web | TanStack Query | Cache, retries and background refresh without writing that logic |
| Map | SVG with d3-geo and our own TopoJSON | It already works on the landing. With about 820 regions there is no need for a map engine; if it gets slow on mobile, it moves to Canvas |
| Game rules | Postgres functions (PL/pgSQL) called through RPC | Each action is validated and applied in a single transaction, with no way to skip a rule |
| Data | Postgres on Supabase, with row level security (RLS) | Each player reads only what concerns them and nobody writes tables directly |
| Money | Double-entry ledger | Each movement records source, destination and reason; balances can be audited and rebuilt |
| Real time | Supabase Realtime, one channel per battle | The scoreboard is published aggregated every few seconds, not per hit |
| Scheduled jobs | Cloudflare Cron Triggers that call database functions | Every job can be repeated without a double effect: if it runs twice, the second run changes nothing |
| Accounts | Supabase Auth, with Cloudflare Turnstile on sign-up | Login solved. Turnstile is free and stops automated sign-ups |
| Email | Resend, sent from Supabase Edge Functions | Account verification and notices |
| Tests | pgTAP for database functions, Vitest for the web and Playwright for full journeys | Rules are tested where they live |
| Delivery | GitHub Actions: tests, migrations and deployment | Two free Supabase projects: staging and production |
| Errors | Sentry (free plan limits to confirm) | Web errors with context to reproduce them |
| Map source | Python scripts that generate the TopoJSON from Natural Earth | They already exist. Each region has a fixed code, shared by the map and the database |

**How the code is organized**

A single repository with every piece, so that a rule change, its test and its screen travel together
(English folder names per ADR 0004):

```text
concordia/
  apps/web/              React: game, landing and admin panel
  apps/clock/            Cloudflare Worker with the scheduled jobs
  supabase/migrations/   tables, functions and permissions, in SQL
  supabase/tests/        rule tests (pgTAP)
  supabase/functions/    Edge Functions (email)
  packages/db-types/     TypeScript types generated from the database
  data/map/              map scripts and generated TopoJSON
```

**Main data, by module**

| Module | Tables |
| --- | --- |
| World (2) | countries, regions, current owner of each region |
| Citizen (3) | citizens, citizenship requests, inventory |
| Economy (4) | companies, jobs, market offers, ledger movements, banks, loans, deposits, contracts between countries |
| Politics (5) | parties, offices, elections, laws, votes |
| War (6) | wars, battles, rounds, damage aggregated per player and battle, hospitals |
| Society (7) | newspapers, articles, messages, notifications |
| Operations (11) | scheduled job log, admin action log |

**Technical rules**

- The database is the authority: the browser asks to "work" and the database decides whether it can, how
  much it pays and what changes.
- Each action has a rate limit per player, enforced in the same function.
- Times are stored in UTC. The game day (GMT−3) is computed by a single database function.
- Every admin action is logged: who, what and when.
- Database changes are made only with migrations in the repository, tested first in the staging project.

**When something would change**

- If live battles exceed what Supabase Realtime offers, each battle moves to a Cloudflare Durable Object with
  WebSockets.
- If a phone app is requested, first the same web as an installable app; a native app only if that is not
  enough.

**Open**

- [x] Server technology and where it is hosted: Supabase and Cloudflare (see Infrastructure on a $0 budget)
- [ ] How many players the first world must support
- [ ] Multi-account policy

## 12 · Balance, metrics and glossary

All the game's numbers live in a single parameters table, so they can be tuned without rewriting modules.
This module fills in as the others set values.

**Includes**

- Parameters table: energy costs, rewards, taxes, formulas
- Health metrics: daily active players, retention, inflation, battles per day
- Glossary of game terms
- Log of decisions made and their date

**Indicators to tune the balance**

The values in modules 4 and 6 are the starting point. These indicators say when to change them.

| Indicator | Healthy range | If it leaves the range |
| --- | --- | --- |
| Net Gold per active player per day | 0 to +0.5 | Lower the weekly streak reward or raise the cost of companies |
| Ration price on the market | 10 to 20 Credit | Adjust wheat yield or slow down issuance |
| Veteran damage per hit compared to a new player | 15 times or less | Lower the rank factor (0.03 today) |
| Battles opened per country per day | 0.5 to 2 | Adjust the fuel needed to open a battle |
| Players who use advanced training | Less than 50 % | If more, Gold weighs too much in war: raise its cost |
| Regions that change hands per week | 1 to 5 % of the total | Adjust the defense and resistance bonuses |

**Initial glossary** (the full mapping to code names is in `docs/glossary.md`)

- **Region:** the smallest unit of territory; it always has an owner country.
- **Occupied:** a region whose current owner is not its country of origin.
- **Energy:** the daily resource that actions spend.
- **Gold:** the currency shared by the whole world.
- **Credit:** the currency earned by working.

## Development plan

The game is built in 30 development modules, grouped in 8 phases. Each module is programmed, tested against
a concrete criterion and closed before starting the next one that depends on it. The codes D01 to D30 tell
them apart from the 12 design modules.

Already done: the design document, and the region map with the test landing, which are the base of D03 and D04.

| Code | Module | Phase | Depends on | Progress |
| --- | --- | --- | --- | --- |
| D01 | Repository and automated delivery | 0 · Base | — | See `docs/progress.md` |
| D02 | Clock and game day | 0 · Base | D01 | |
| D03 | World: countries, regions and owners | 1 · World and accounts | D01 | |
| D04 | Game map | 1 · World and accounts | D03 | |
| D05 | Accounts | 1 · World and accounts | D01 | |
| D06 | Citizenship | 1 · World and accounts | D03, D05 | |
| D07 | Admin panel | 1 · World and accounts | D03, D05 | |
| D08 | Profile and energy | 2 · Basic economy | D05 | |
| D09 | Ledger and currencies | 2 · Basic economy | D01 | |
| D10 | Companies and work | 2 · Basic economy | D08, D09 | |
| D11 | Market | 2 · Basic economy | D10 | |
| D12 | Products and consumption | 2 · Basic economy | D11 | |
| D13 | Daily missions | 2 · Basic economy | D10, D12 | |
| D14 | Training | 3 · War | D08 | |
| D15 | Battles and rounds | 3 · War | D02, D03, D12 | |
| D16 | Combat and damage | 3 · War | D14, D15 | |
| D17 | Live battle | 3 · War | D16 | |
| D18 | Conquest and hospitals | 3 · War | D16 | |
| D19 | Parties and elections | 4 · Politics | D06 | |
| D20 | Government offices | 4 · Politics | D19 | |
| D21 | Laws and votes | 4 · Politics | D20 | |
| D22 | Resources and deposits | 5 · Advanced economy | D10, D18 | |
| D23 | Banks and partnerships | 5 · Advanced economy | D09, D21 | |
| D24 | Currency exchange and issuance | 5 · Advanced economy | D21 | |
| D25 | Press and news | 6 · Society and retention | D05 | |
| D26 | Messages and notifications | 6 · Society and retention | D05 | |
| D27 | Tutorial and achievements | 6 · Society and retention | D13 | |
| D28 | Fair play | 7 · Closed beta | D10, D16 | |
| D29 | Operations and monitoring | 7 · Closed beta | D02 | |
| D30 | Beta launch | 7 · Closed beta | D28, D29 | |

Time-dependent tests (rounds, 72 hours, energy recharge) use a simulated clock, so they do not wait real hours.

### Phase 0 · Base

#### D01 · Repository and automated delivery

- [ ] Single repository with the module 11 layout
- [ ] Two Supabase projects (staging and production) and a Cloudflare account
- [ ] GitHub Actions: code and type review, tests, migrations and deployment

**Test:** a minimal change passes the tests, reaches the staging project on its own and, once approved,
production.

#### D02 · Clock and game day

- [ ] Game day function in GMT−3
- [ ] Cloudflare Worker with the scheduled jobs
- [ ] Job log, so that a repeated job does not apply its effect twice

**Test:** at 03:00 UTC the game day changes, and running the same job twice leaves a single effect.

### Phase 1 · World and accounts

#### D03 · World: countries, regions and owners

- [ ] Tables for countries, regions and current owner
- [ ] Load the 78 regions of the 13 countries with their fixed code
- [ ] Public read of the map state

**Test:** the database returns 13 active countries and 78 regions, each with its owner.

#### D04 · Game map

- [ ] Landing map moved into the app
- [ ] Owners and colors read from the database

**Test:** changing a region's owner in the database changes its color on the map after reloading.

#### D05 · Accounts

- [ ] Sign-up and sign-in with Supabase Auth
- [ ] Turnstile on sign-up
- [ ] Verification email with Resend

**Test:** a person signs up, verifies their email, signs in and signs out; a sign-up without Turnstile is
rejected.

#### D06 · Citizenship

> Updated by `docs/brief.md` section 3 (immediate citizenship, adaptation period, waitlist).

- [ ] Citizen creation and citizenship request
- [ ] Approval by the Interior minister or the president, with resident status while waiting
- [ ] Automatic approval at 72 hours for new players

**Test:** an approved request grants citizenship; another without an answer is approved on its own at 72 hours.

#### D07 · Admin panel

- [ ] Activate and deactivate countries
- [ ] Enable disputed territories and review regions
- [ ] Log of every admin action

**Test:** deactivating a country turns it gray on the map and records who did it.

### Phase 2 · Basic economy

#### D08 · Profile and energy

- [ ] Profile with level, experience, strength, rank and influence
- [ ] Energy computed on arrival: 10 per hour, maximum 100

**Test:** with the clock moved 3 hours forward, energy rises by 30 and never goes above 100.

#### D09 · Ledger and currencies

- [ ] Double-entry ledger
- [ ] Gold and one local currency per country
- [ ] Transfers as database functions

**Test:** after 1,000 random transfers, the total money does not change and no balance is negative.

#### D10 · Companies and work

- [ ] Create raw material companies and factories, paying in Gold
- [ ] Job offers, working once per day and collecting a wage
- [ ] Work tax to the treasury

**Test:** working twice on the same day is rejected, and the wage collected is the gross minus 12 %.

#### D11 · Market

- [ ] Post offers and buy
- [ ] VAT, tariff and the 1 % fee

**Test:** in a purchase, the money that leaves the buyer is exactly what the seller and the treasury receive,
plus the fee that leaves the game.

#### D12 · Products and consumption

- [ ] Rations, Q1 to Q5 weapons and fuel
- [ ] Eating rations, capped at 200 energy per day

**Test:** recovering more than 200 energy from food on the same day is rejected.

#### D13 · Daily missions

- [ ] Four daily missions with a 1 Gold reward
- [ ] 7-day streak with 3 extra Gold

**Test:** completing all four pays 1 Gold only once per day.

### Phase 3 · War

While Congress does not exist (D21), wars are declared from the admin panel.

#### D14 · Training

- [ ] Train once per day: +10 strength
- [ ] Advanced training: +20 for 1 Gold

**Test:** training twice on the same day is rejected.

#### D15 · Battles and rounds

- [ ] Open land, naval and air battles, with their requirements and fuel
- [ ] 4-hour rounds closed by the clock, best of 5
- [ ] At most 2 offensive battles per country

**Test:** a country without available coast cannot open a naval battle, and a battle ends when a side wins 3
rounds.

#### D16 · Combat and damage

- [ ] Hit with the damage formula, weapons and bonuses
- [ ] Volunteers at −25 %
- [ ] Damage aggregated per player and battle, and the round hero

**Test:** damage per hit matches the module 6 profile table.

#### D17 · Live battle

- [ ] One Realtime channel per battle
- [ ] Scoreboard published aggregated every few seconds

**Test:** two browsers see the same scoreboard while a third one fights.

#### D18 · Conquest and hospitals

- [ ] Change of owner and color on winning
- [ ] Field hospitals with a budget

**Test:** on winning a battle, the region changes color on every player's map.

### Phase 4 · Politics

The open items of module 5 must be closed before starting.

#### D19 · Parties and elections

- [ ] Parties and membership
- [ ] Presidential and congressional elections, alternating every 15 days

**Test:** with the simulated clock, a presidential and a congressional election alternate every 15 days, and
whoever has the most votes wins.

#### D20 · Government offices

- [ ] Vice president, ministers and ambassadors appointed by the president
- [ ] Permissions of each office

**Test:** only the president and the War minister can open a battle.

#### D21 · Laws and votes

- [ ] Law types: taxes, war and peace, minimum wage and citizenship criteria
- [ ] Voting with a deadline and applying the effect

**Test:** a passed law that raises a tax changes what is charged from the next day.

### Phase 5 · Advanced economy

The source of real resource data must be chosen before starting.

#### D22 · Resources and deposits

- [ ] Deposits of each region computed from real data
- [ ] Exploration, maintenance and production bonus
- [ ] Deposit contracts between countries

**Test:** exploring a level 2 deposit takes the production of that raw material from 50 % to 80 %.

#### D23 · Banks and partnerships

- [ ] Central bank and official accounts
- [ ] Private bank tender: deposits, loans, collateral and default
- [ ] Partnerships between players

**Test:** an unpaid loan deducts 50 % of each of the borrower's wages until it is settled.

#### D24 · Currency exchange and issuance

- [ ] Exchange market between Gold and local currencies
- [ ] Issuance law: 1 treasury Gold for every 100 Credit

**Test:** issuing 1,000 Credit deducts 10 Gold from the treasury.

### Phase 6 · Society and retention

#### D25 · Press and news

- [ ] Newspapers and articles
- [ ] Automatic news of battles, laws and conquests

**Test:** a conquest publishes an automatic news item in the conquered country.

#### D26 · Messages and notifications

- [ ] Messages between players
- [ ] Notifications of battles, votes and citizenship

**Test:** opening a vote notifies every citizen of the country.

#### D27 · Tutorial and achievements

- [ ] New citizen tutorial
- [ ] Achievements and medals

**Test:** a new player completes the tutorial and ends with their first workday done.

### Phase 7 · Closed beta

Monetization comes after this phase, once module 9 is closed.

#### D28 · Fair play

- [ ] Rate limits on every action
- [ ] Multi-account detection

**Test:** a script that repeats an action very fast is stopped by the limit.

#### D29 · Operations and monitoring

- [ ] Daily database backup and a tested restore
- [ ] Error logging with Sentry
- [ ] Dashboard with the module 12 indicators

**Test:** the previous day's backup is restored in the staging project and the game works.

#### D30 · Beta launch

- [ ] Review the free plan conditions
- [ ] Terms of use and privacy policy
- [ ] Invite the first players

**Test:** the first invited players sign up and play a full day without blocking errors.
