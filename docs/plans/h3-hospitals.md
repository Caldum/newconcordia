# H3 · Public hospitals

**Acceptance (roadmap H3):** public hospitals N1–N5 per region, stock of kits only, automatic quality choice, care
policy, stock privacy (Health minister and president only).

## Design (ADR 0031)

- Migration `20261023090000_hospitals.sql`: `game.hospitals`, `game.care_policies`, `game.care_policy_changes`,
  `game.treatments`; `game.holder_for_hospital`, `game.require_health_minister`, `game.own_region`,
  `game.care_allowed`, `game.choose_kit`; public `build_hospital`, `upgrade_hospital`, `move_kits`,
  `set_care_policy`, `hospital_treatment`, `list_hospitals`, `get_care_policy`, `list_care_policy_changes`,
  `get_hospital_stock`, `get_my_hospital`.
- Web: `/hospital` (Military → Hospital).

## Tests

- pgTAP `260_hospitals.test.sql` (43): who builds and where, idempotent building and upgrades paid by Health, kits
  only, moving kits both ways, the lowest sufficient compatible kit (N2 never uses Q3; Q5 at 97 HP stops at
  100), partial recovery, idempotent treatment, care policies and their log, no hospital in the region, public
  levels and private stock, the ledger.
- Vitest: the hospital page (a treatment without stock shown; the minister's policy and stock).
