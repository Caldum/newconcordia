# H1 + H2 · Training centers, injuries and zero health

**Acceptance (roadmap H1, H2):** training centers Basic, Advanced and Elite N1–N5: sessions per UTC day, energy,
fees, strength, civil XP, upgrades, injuries; kits for personal use (R7), injuries, zero-health restrictions.

## Design (ADR 0030)

- Migration `20261022090000_training_and_injuries.sql`: `game.random`, `game.injuries`, `game.injure`,
  `game.training_centers`, `game.training_sessions`, `game.center_level`; public `train`,
  `upgrade_training_center`, `get_my_training`, `list_my_injuries`; balance parameters for every value.
- Web: `/training` (Military): the three centers with session and upgrade, the injuries.

## Tests

- pgTAP `250_training.test.sql` (29): the three centers' costs and gains, one session per center and day, fees
  paid and burned, upgrades to N5 for 75 GOLD and idempotent, the Elite N5 gain, injuries after the gains and by
  level, never below zero, zero health blocks training while a kit still heals, energy, the ledger, privileges.
- Vitest: the training page (a session with an injury, an upgrade).
