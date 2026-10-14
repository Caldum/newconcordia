# R7 · Stage 1 demo journey

**Acceptance (roadmap R7):** a citizen works → produces a kit → sells → another buys → consumes; ledger
consistent.

## Design (ADR 0023)

- Migration `20261015090000_personal_kits.sql`: `game.kit_uses` and `public.use_kit`.
- Work, produce, sell and buy already exist (R5, R6); the missing step was consuming a kit.
- Web: a «Use one» button on each kit of the inventory (`features/inventory/UseKitButton.tsx`, action in
  `features/inventory/api.ts`), off at full health, with what it healed.

## Tests

- pgTAP `180_stage1_journey.test.sql` (21): a medical extractor and a kit maker worked by their owner (187 raw,
  25 kits, 125 raw used), the kits sold from the depot and one bought, the kit used (5 HP, idempotent,
  refused at full health, without kits and for food), at zero health and with waste near 100, the use log,
  and every currency balancing to zero.
- Vitest: using a kit and the button off at full health.
- Playwright `stage1-journey.spec.ts`: the same journey through the screens (not run here: no Docker).
