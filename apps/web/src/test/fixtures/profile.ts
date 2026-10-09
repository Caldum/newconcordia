import type { ProfileRow } from '../../features/profile/useProfile';

/**
 * A profile as get_my_profile returns it: Camila, level 26 with 80 energy, read at 15:00 server time.
 * The server clock is pinned in the past, so the meter only moves when a test moves the browser clock.
 */
export function profileRow(overrides: Partial<ProfileRow> = {}): ProfileRow {
  return {
    name: 'Camila Ríos',
    country_code: 'ARG',
    citizen_code: 'ARG-003413',
    region_code: 'ARG-01',
    joined_at: '2026-08-28T15:00:00Z',
    level: 26,
    experience: 6420,
    level_experience: 6250,
    next_level_experience: 6760,
    strength: 1840,
    damage: 1500000,
    rank: 12,
    next_rank_damage: 1690000,
    influence: 340,
    energy: 80,
    energy_max: 100,
    energy_per_hour: 10,
    next_energy_at: '2026-10-08T15:06:00Z',
    checked_at: '2026-10-08T15:00:00Z',
    ...overrides,
  };
}
