import { describe, expect, it } from 'vitest';

import { sellSources } from './sellSources';

describe('sell sources', () => {
  it('lists the inventory first, then each depot, with whole units only', () => {
    const sources = sellSources(
      [
        { good_code: 'food_q1', quantity: 18 },
        { good_code: 'military_raw', quantity: 0.5 },
      ],
      [
        {
          company: { id: 3, name: 'Taller Ríos' },
          stock: [{ good_code: 'weapon_q3', quantity: 42.7 }],
        },
      ],
    );
    expect(sources).toEqual([
      { id: 'inventory:food_q1', good: 'food_q1', available: 18, company: null },
      {
        id: 'company:3:weapon_q3',
        good: 'weapon_q3',
        available: 42,
        company: { id: 3, name: 'Taller Ríos' },
      },
    ]);
  });

  it('is empty when nothing can be sold', () => {
    expect(sellSources([], [])).toEqual([]);
  });
});
