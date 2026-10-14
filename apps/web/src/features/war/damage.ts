/** What an attack needs to compute its damage (spec section 6). */
export interface Fighter {
  strength: number;
  /** 0–100. */
  health: number;
  /** Rank step 0–75. */
  rankStep: number;
  /** Quality 1–5 of the equipped weapon, 0 unarmed. */
  weaponQuality: number;
}

/**
 * floor((10 + F) × HP/100 × (1 + 0.2 Q) × (1 + 0.05 × min(n, 75))). Integer arithmetic in hundredths avoids
 * floating error; the database computes the same with numeric.
 */
export function attackDamage({ strength, health, rankStep, weaponQuality }: Fighter): number {
  const weapon = 100 + 20 * weaponQuality;
  const rank = 100 + 5 * Math.min(rankStep, 75);
  return Math.floor(((10 + strength) * health * weapon * rank) / (100 * 100 * 100));
}

/** XP of an attack: damage with additive bonuses (+0.5 against the enemy, +0.1 in the priority battle). */
export function attackXp(damage: number, enemy: boolean, priority: boolean): number {
  const bonus = 10 + (enemy ? 5 : 0) + (priority ? 1 : 0);
  return Math.floor((damage * bonus) / 10);
}
