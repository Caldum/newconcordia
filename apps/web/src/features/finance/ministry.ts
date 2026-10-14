import type { MinistryCode } from '../politics/billTerms';

const qualities = [1, 2, 3, 4, 5] as const;
const kits = qualities.map((q) => `kit_q${String(q)}`);
const food = qualities.map((q) => `food_q${String(q)}`);
const weapons = qualities.map((q) => `weapon_q${String(q)}`);

/**
 * Goods a ministry may buy on the national market (the database checks it again): Health medical kits and their raw
 * material, Defense weapons, food and their raw materials, Development raw materials. Economy and Foreign Affairs buy
 * nothing.
 */
export function ministryGoods(ministry: MinistryCode): string[] {
  switch (ministry) {
    case 'health':
      return ['medical_raw', ...kits];
    case 'defense':
      return ['food_raw', 'military_raw', ...food, ...weapons];
    case 'development':
      return ['food_raw', 'military_raw', 'medical_raw'];
    case 'economy':
    case 'foreign_affairs':
      return [];
  }
}

/** The ministry an office leads, or null. */
export function ministryOf(office: string | null): MinistryCode | null {
  const match = /^minister_(economy|defense|foreign_affairs|health|development)$/.exec(
    office ?? '',
  );
  return match ? (match[1] as MinistryCode) : null;
}
