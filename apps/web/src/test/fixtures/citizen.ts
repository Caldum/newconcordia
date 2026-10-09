import type { Citizen } from '../../features/auth/useCitizen';

/** A citizen as get_my_citizen returns it: Camila, who joined two days ago and is still adapting. */
export function citizenRow(overrides: Partial<Citizen> = {}): Citizen {
  const day = 24 * 60 * 60 * 1000;
  const joined = new Date(Date.now() - 2 * day).toISOString();
  return {
    name: 'Camila Ríos',
    country_code: 'ARG',
    locale: 'es',
    citizen_code: 'ARG-003413',
    region_code: 'ARG-01',
    joined_at: joined,
    citizen_since: joined,
    adaptation_ends_at: new Date(Date.parse(joined) + 7 * day).toISOString(),
    votes_in_elections_from: new Date(Date.parse(joined) + 7 * day).toISOString(),
    next_change_from: null,
    reviews_citizenship: false,
    ...overrides,
  };
}
