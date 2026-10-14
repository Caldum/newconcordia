import { describe, expect, it } from 'vitest';

import { attackDamage, attackXp } from './damage';

describe('attackDamage', () => {
  it('follows the specification formula', () => {
    expect(attackDamage({ strength: 0, health: 100, rankStep: 0, weaponQuality: 0 })).toBe(10);
    expect(attackDamage({ strength: 0, health: 100, rankStep: 0, weaponQuality: 5 })).toBe(20);
    expect(attackDamage({ strength: 90, health: 50, rankStep: 2, weaponQuality: 3 })).toBe(88);
    expect(attackDamage({ strength: 0, health: 95, rankStep: 0, weaponQuality: 0 })).toBe(9);
  });

  it('caps the rank bonus at step 75', () => {
    expect(attackDamage({ strength: 0, health: 100, rankStep: 80, weaponQuality: 0 })).toBe(47);
  });

  it('does no damage at zero health', () => {
    expect(attackDamage({ strength: 500, health: 0, rankStep: 10, weaponQuality: 5 })).toBe(0);
  });
});

describe('attackXp', () => {
  it('adds the bonuses, +60 % at most', () => {
    expect(attackXp(10, true, false)).toBe(15);
    expect(attackXp(20, true, true)).toBe(32);
    expect(attackXp(10, false, false)).toBe(10);
  });
});
