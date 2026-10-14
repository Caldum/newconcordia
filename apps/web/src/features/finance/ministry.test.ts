import { describe, expect, it } from 'vitest';

import { ministryGoods, ministryOf } from './ministry';

describe('ministryGoods', () => {
  it('follows each ministry’s competences', () => {
    expect(ministryGoods('health')).toContain('kit_q5');
    expect(ministryGoods('health')).not.toContain('weapon_q1');
    expect(ministryGoods('defense')).toEqual(
      expect.arrayContaining(['weapon_q3', 'food_q1', 'military_raw']),
    );
    expect(ministryGoods('development')).toEqual(['food_raw', 'military_raw', 'medical_raw']);
    expect(ministryGoods('economy')).toEqual([]);
  });
});

describe('ministryOf', () => {
  it('reads the ministry of a minister’s office', () => {
    expect(ministryOf('minister_health')).toBe('health');
    expect(ministryOf('president')).toBeNull();
    expect(ministryOf(null)).toBeNull();
  });
});
