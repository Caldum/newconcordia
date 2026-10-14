import { parseAmount } from '../ledger/amount';

export type BillKind =
  | 'ordinary'
  | 'taxes'
  | 'gold_transfer'
  | 'ministry_allocation'
  | 'currency_issuance'
  | 'central_bank_allocation';

export const taxKeys = ['vat', 'tariff', 'work_tax', 'export_tax'] as const;
export type TaxKey = (typeof taxKeys)[number];

/** The legal ceiling of each tax, in percent (the database checks it again). */
export const taxCeilings: Record<TaxKey, number> = {
  vat: 25,
  tariff: 50,
  work_tax: 30,
  export_tax: 100,
};

/** What the player typed: percentages for taxes, an amount for the minimum wage. Empty means unchanged. */
export type TaxDraft = Record<TaxKey | 'minimum_wage', string>;

export const emptyTaxDraft: TaxDraft = {
  vat: '',
  tariff: '',
  work_tax: '',
  export_tax: '',
  minimum_wage: '',
};

/** «7» or «7,5» percent → 0.07 or 0.075, up to two decimals and the ceiling; null when invalid. */
export function parsePercent(text: string, ceiling: number): number | null {
  const match = /^(\d{1,3})(?:[.,](\d{1,2}))?$/.exec(text.trim());
  if (!match) return null;
  const basisPoints = Number(match[1]) * 100 + Number((match[2] ?? '').padEnd(2, '0'));
  return basisPoints <= ceiling * 100 ? basisPoints / 10000 : null;
}

/** The terms of a tax bill, or null when a field is invalid or nothing changes. */
export function taxTerms(draft: TaxDraft): Record<string, number> | null {
  const terms: Record<string, number> = {};
  for (const key of taxKeys) {
    if (!draft[key].trim()) continue;
    const value = parsePercent(draft[key], taxCeilings[key]);
    if (value === null) return null;
    terms[key] = value;
  }
  if (draft.minimum_wage.trim()) {
    const wage = draft.minimum_wage.trim() === '0' ? 0 : parseAmount(draft.minimum_wage);
    if (wage === null) return null;
    terms.minimum_wage = wage;
  }
  return Object.keys(terms).length > 0 ? terms : null;
}

/** The terms of a transfer of Gold to another country's Treasury, or null when the amount is invalid. */
export function transferTerms(
  country: string | null,
  amountText: string,
): { country_code: string; amount: number } | null {
  const amount = parseAmount(amountText);
  return country && amount !== null ? { country_code: country, amount } : null;
}

export const ministries = [
  'economy',
  'defense',
  'foreign_affairs',
  'health',
  'development',
] as const;
export type MinistryCode = (typeof ministries)[number];

/** An allocation of Gold and national Credit to one ministry; at least one above zero, both from the Treasury. */
export function allocationTerms(
  ministry: MinistryCode,
  goldText: string,
  creditText: string,
): { ministry: MinistryCode; gold: number; credit: number } | null {
  const gold = goldText.trim() ? parseAmount(goldText) : 0;
  const credit = creditText.trim() ? parseAmount(creditText) : 0;
  if (gold === null || credit === null || gold + credit === 0) return null;
  return { ministry, gold, credit };
}

/** New national currency for the Treasury, or null when the amount is invalid. */
export function issuanceTerms(amountText: string): { amount: number } | null {
  const amount = parseAmount(amountText);
  return amount === null ? null : { amount };
}

/** Everything the bill form can hold; each kind reads its own fields. */
export interface BillDraft {
  taxes: TaxDraft;
  /** Receiving country of a transfer; null until picked. */
  country: string | null;
  /** Gold of a transfer or an allocation, or the national currency of an issuance. */
  amount: string;
  ministry: MinistryCode;
  /** National Credit of an allocation. */
  credit: string;
}

export const emptyBillDraft: BillDraft = {
  taxes: emptyTaxDraft,
  country: null,
  amount: '',
  ministry: 'health',
  credit: '',
};

/** The terms the database expects for a kind, or null when the draft does not make a valid bill. */
export function billTerms(
  kind: BillKind,
  draft: BillDraft,
): Record<string, string | number> | null {
  switch (kind) {
    case 'ordinary':
      return {};
    case 'taxes':
      return taxTerms(draft.taxes);
    case 'gold_transfer':
      return transferTerms(draft.country, draft.amount);
    case 'ministry_allocation':
      return allocationTerms(draft.ministry, draft.amount, draft.credit);
    case 'currency_issuance':
      return issuanceTerms(draft.amount);
    case 'central_bank_allocation': {
      const terms = allocationTerms(draft.ministry, draft.amount, draft.credit);
      return terms && { gold: terms.gold, credit: terms.credit };
    }
  }
}
