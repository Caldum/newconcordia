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
| Día de juego | Game day | `game_day` (`game.game_day()`) |
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
| Rango | Rank | `rank` |
| Empresa, empleo, salario | Company, job, wage | `company`, `job`, `wage` |
| Tesoro | Treasury | `treasury` |
| Congreso, congresista | Congress, member of Congress | `congress`, `congress_member` |
| Banca (escaño) | Seat | `seat` |
| Ley | Law | `law` |
| Presidente, vicepresidenta | President, vice president | `president`, `vice_president` |
| Ministro del Interior | Interior minister | `interior_minister` |
| Adaptación (primeros 7 días) | Adaptation period | `adaptation_period` |
| Perfil | Profile | `profile` (`get_my_profile`) |
| Nivel, experiencia | Level, experience | `level`, `experience` |
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
