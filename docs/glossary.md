# Glossary: game terms and code names

Code, database and commits are in English; the interface is in Spanish (source) and English. This table
fixes the correspondence. When a new term appears in the code, it is added here in the same PR.

| Game (Spanish interface) | English interface | Code and database |
| --- | --- | --- |
| Ciudadano, ciudadana | Citizen | `citizen` |
| Ciudadanía | Citizenship | `citizenship` |
| Lista de espera | Waitlist | `waitlist` |
| País | Country | `country` |
| Región | Region | `region` |
| Dueño de la región | Region owner | `owner_country_code` |
| País de origen de la región | Home country | `home_country_code` |
| Código de región (ARG-05) | Region code | `regions.code` |
| Ocupada | Occupied | `occupied` |
| En juego / fuera de juego | In play / not in play | `active` / `inactive` |
| Territorio en disputa | Disputed territory | `is_enabled = false` until the admin panel enables it |
| Día de juego (UTC) | Game day | `game_day` (`game.game_day()`) |
| Reloj del juego | Game clock | `game.now()` |
| Tarea programada | Scheduled job | `scheduled job` |
| Ejecución de una tarea | Job run | `job_run` |
| Franja (de una tarea) | Slot | `slot` |
| Parámetros de balance | Balance parameters | `balance_params` |
| Registro de administración | Admin audit log | `admin_audit_log` |
| Oro | Gold | `gold` |
| Crédito | Credit | `credit` |
| Ración | Ration | `ration` |
| Arma | Weapon | `weapon` |
| Combustible | Fuel | `fuel` |
| Golpe | Hit | `hit` |
| Daño | Damage | `damage` |
| Batalla, ronda | Battle, round | `battle`, `round` |
| Energía | Energy | `energy` |
| Fuerza | Strength | `strength` |
| Rango militar (Novato, Milicia I … General V) | Military rank | `rank_step` 0–75 (`game.rank_step()`) |
| Experiencia militar | Military experience | `military_xp` |
| Salud | Health | `player_stats.health` |
| Premio de nivel | Level reward | `level_reward` (`game.add_civil_xp()`) |
| Fondos reservados, reserva | Hold, escrow | `ledger_holds`, account kind `escrow` (`game.hold()`) |
| Emisión, quema | Mint, burn | `supply_changes` (`mint`, `burn`), `mint_reasons` |
| Regalo de bienvenida | Sign-up grant | `welcome_grant` (`game.grant_welcome()`) |
| Materia prima alimentaria, militar, médica | Food, military, medical raw material | `food_raw`, `military_raw`, `medical_raw` |
| Comida, armas, botiquines Q1–Q5 | Food, weapons, medical kits Q1–Q5 | `food_q1`…, `weapon_q1`…, `kit_q1`… |
| Titular (de un inventario) | Holder | `holders` (citizen, company, ministry, hospital) |
| Lote, origen | Lot, origin | `inventory_lots`, `origin_country_code` |
| Movimiento de inventario | Inventory movement | `inventory_movements` |
| Comida automática (cada 5 minutos) | Automatic food | `automatic_food`, `game.settle_food()`, `player_stats.food_at` |
| Recurso (15), recursos de la región | Resource, region resources | `resources`, `region_resources` |
| Bono nacional | National bonus | `game.national_bonus()` |
| Extractora, manufacturera | Extractor, manufacturer | `companies.kind` |
| Nivel de empresa N1–N5 | Company level | `companies.level` |
| Turno (pagado, segundo, de dirección) | Shift (regular, second, management) | `work_shifts.kind` |
| Recargo de construcción extranjera | Foreign construction surcharge | `country_policies.foreign_construction_surcharge` |
| Empresa, empleo, salario | Company, job, wage | `company`, `job`, `wage` |
| Tesoro | Treasury | `treasury` |
| Congreso, congresista | Congress, member of Congress | `congress`, `congress_member` |
| Banca (escaño) | Seat | `seat` |
| Ley | Law | `law` |
| Presidente, vicepresidenta | President, vice president | `president`, `vice_president` |
| Ministro del Interior | Interior minister | `interior_minister` |
| Adaptación (primeros 7 días) | Adaptation period | `adaptation_period` |
| Perfil | Profile | `profile` (`get_my_profile`) |
| Nivel (civil), experiencia | Civil level, experience | `level`, `experience` |
| Influencia | Influence | `influence` |
| Daño total (acumulado) | Total damage | `player_stats.damage` |
| Estadísticas del jugador | Player stats | `player_stats` |
| Moneda | Currency | `currency` (`GOLD`, or the country code for its Credit) |
| Cuenta, saldo | Account, balance | `accounts`, `balance` (hundredths) |
| Movimiento (asiento) | Posting | `ledger_postings` |
| Contrapartida | Counterparty | `counterparty` |
| Emisión (cuenta emisora) | Issuer | `issuer` account |
| Salida del juego | Sink | `sink` account |
| Regalo de bienvenida | Welcome grant | `welcome_grant` |
| Transferencia | Transfer | `transfer` |
| Empresa, caja de la empresa | Company, company cash | `companies`, `company` account |
| Depósito (de la empresa) | Depot, stock | `company_stock` |
| Materia prima, producto | Raw material, product | `goods.kind` `raw` / `product` |
| Jornada (de trabajo) | Workday | `workdays` |
| Oferta de empleo, vacantes | Job offer, vacancies | `vacancies` |
| Impuesto al trabajo | Work tax | `country_policies.work_tax` |
| Salario mínimo | Minimum wage | `country_policies.minimum_wage` |
| Rendimiento (de la región) | Yield | `raw_yield` |
| Mercado | Market | `market_offers`, `market_trades` |
| Oferta (del mercado) | Offer, sell order | `market_offers` (`status`) |
| Impuesto a la exportación | Export tax | `country_policies.export_tax` |
| Partido, afiliado, líder | Party, member, leader | `parties`, `party_memberships`, `leader_user_id` |
| Donación | Donation | `donate_to_party`, account kind `party` |
| Elección, candidatura, padrón, voto | Election, candidacy, voter snapshot, ballot | `elections`, `candidacies`, `election_voters`, `ballots` |
| Usar un botiquín | Use a kit | `use_kit`, `kit_uses` |
| Licencia de mercado extranjero | Foreign market license | `market_access_licenses`, `buy_market_license` (10 GOLD) |
| Inventario | Inventory | `inventories` |
| IVA | VAT | `country_policies.vat` |
| Arancel | Tariff | `country_policies.tariff` |
| Comisión del mercado | Market fee | `market_fee` |
| Importación | Import | `imported` |
| Ración, comer | Ration, eat | `ration`, `eat_rations` |
| Energía por comida (máximo diario) | Food energy (daily maximum) | `food_days`, `food_energy_daily_max` |
| Multiplicador de daño (arma) | Damage multiplier | `goods.damage_multiplier` |
| Objetos | Items | `inventories` |
