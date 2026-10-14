const named = [
  'hold',
  'hold_release',
  'ministry_allocation',
  'ministry_payment',
  'currency_issuance',
  'gold_transfer',
  'market_tax',
  'market_sale',
  'market_fee',
  'export_tax',
  'work_tax',
  'market_license',
  'candidacy_fee',
] as const;

export type MovementKind = (typeof named)[number] | 'other';

/** The catalog name of a posting kind of public money; anything new reads as a plain movement. */
export function movementKind(kind: string): MovementKind {
  return (named as readonly string[]).includes(kind) ? (kind as MovementKind) : 'other';
}

/** «ARG:health» (a ministry's account label) → «health»; null for anything else. */
export function ministryOfLabel(label: string | null): string | null {
  return /^[A-Z]{3}:([a-z_]+)$/.exec(label ?? '')?.[1] ?? null;
}
