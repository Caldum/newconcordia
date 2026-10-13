/** Highest rank step: General V (spec section 6). The database caps it too. */
export const rankStepsMax = 75;
const tiersPerRank = 5;

/**
 * Splits a rank step from get_my_profile into the rank (0 = Novice, 1 = Militia … 15 = General) and its
 * level I–V (0 for Novice).
 */
export function rankOf(step: number): { rank: number; tier: number } {
  const capped = Math.min(Math.max(step, 0), rankStepsMax);
  if (capped === 0) return { rank: 0, tier: 0 };
  return {
    rank: Math.floor((capped - 1) / tiersPerRank) + 1,
    tier: ((capped - 1) % tiersPerRank) + 1,
  };
}

const roman = ['', 'I', 'II', 'III', 'IV', 'V'] as const;

/** «Cabo I»: a rank name followed by its level, or the name alone for Novice. */
export function withTier(names: readonly string[], step: number): string {
  const { rank, tier } = rankOf(step);
  const name = names[rank] ?? '';
  return tier === 0 ? name : `${name} ${roman[tier] ?? ''}`;
}
