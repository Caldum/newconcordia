import type { ProfileRow } from '../../features/profile/useProfile';

/**
 * A profile as get_my_profile returns it: Camila, level 8 and Corporal I with 80 energy, read at 15:00 server time.
 * The server clock is pinned in the past, so the meter only moves when a test moves the browser clock.
 */
export function profileRow(overrides: Partial<ProfileRow> = {}): ProfileRow {
  return {
    name: 'Camila Ríos',
    country_code: 'ARG',
    citizen_code: 'ARG-003413',
    region_code: 'ARG-01',
    joined_at: '2026-08-28T15:00:00Z',
    level: 8,
    experience: 6420,
    level_experience: 6400,
    next_level_experience: 8100,
    health: 85,
    health_max: 100,
    strength: 1840,
    military_xp: 13000,
    rank_step: 11,
    rank_xp: 12100,
    next_rank_xp: 14400,
    damage: 1500000,
    influence: 340,
    energy: 80,
    energy_max: 100,
    food_appetite: 2,
    food_appetite_max: 10,
    food_energy_per_interval: 2,
    food_interval_minutes: 1,
    food_at: '2026-10-08T15:00:00Z',
    next_meal_energy: 2,
    checked_at: '2026-10-08T15:00:00Z',
    ...overrides,
  };
}
