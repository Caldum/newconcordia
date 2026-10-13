import { describe, expect, it } from 'vitest';

import { rankOf } from './rank';
import { rankMessages } from './rankMessages';

describe('rankOf', () => {
  it('reads step 0 as Novice, with no level', () => {
    expect(rankOf(0)).toEqual({ rank: 0, tier: 0 });
  });

  it('gives each of the 15 ranks five levels, I to V', () => {
    expect(rankOf(1)).toEqual({ rank: 1, tier: 1 });
    expect(rankOf(5)).toEqual({ rank: 1, tier: 5 });
    expect(rankOf(6)).toEqual({ rank: 2, tier: 1 });
    expect(rankOf(11)).toEqual({ rank: 3, tier: 1 });
    expect(rankOf(75)).toEqual({ rank: 15, tier: 5 });
  });

  it('never goes past General V', () => {
    expect(rankOf(90)).toEqual({ rank: 15, tier: 5 });
  });
});

describe('rank names', () => {
  it('names every step in Spanish', () => {
    expect(rankMessages.es.rankName(0)).toBe('Novato');
    expect(rankMessages.es.rankName(1)).toBe('Milicia I');
    expect(rankMessages.es.rankName(11)).toBe('Cabo I');
    expect(rankMessages.es.rankName(44)).toBe('Teniente IV');
    expect(rankMessages.es.rankName(75)).toBe('General V');
  });

  it('names every step in English', () => {
    expect(rankMessages.en.rankName(0)).toBe('Novice');
    expect(rankMessages.en.rankName(2)).toBe('Militia II');
    expect(rankMessages.en.rankName(33)).toBe('Chief Warrant Officer III');
    expect(rankMessages.en.rankName(75)).toBe('General V');
  });
});
