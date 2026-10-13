# R5 · Resources, companies N1–N5, shifts and production

**Acceptance (roadmap R5):** `floor(150 × eff × HP/100 × (1 + bonus))`; inputs debited match output; no
production without inputs.

## Design (ADR 0020)

- `game.resources` (15) and `game.region_resources` (every region); `game.national_bonus(country)`.
- Companies: `kind`, `category` (derived from the good), level N1–N5; prices, civil levels, paid shifts and
  efficiency in `balance_params`; manufacturing base output in `goods.base_output`.
- `game.work_shifts`; `public.work(key, company)` runs a management, regular or authorized second shift,
  all or nothing; `public.authorize_second_shift`; `public.get_my_shifts_today`.
- Founding anywhere in play (extractors only on their resource), the foreign construction surcharge to the
  host treasury, upgrades raising quality; `upgrade_company_quality` and the points model removed.
- Public `list_resources` and `list_region_resources`.
- Web: company facts (level, shifts, efficiency or quality, bonus), upgrades with their civil level, second
  shift authorization, founding with regions filtered by resource and the surcharge warning, the second
  shift on the Work screen.

## Tests

- pgTAP `160_companies_and_shifts.test.sql` (45): resources, bonus, founding rules and costs, the output
  formulas at full and half health, inputs exact and required, shift kinds and limits, upgrades, surcharge.
- `090` and `140` follow the new rules.
- Vitest: company facts and upgrades, second shift, founding regions and surcharge, `foundableRegions`.
