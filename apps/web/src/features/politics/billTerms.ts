import { parseAmount } from '../ledger/amount';

export type BillKind = 'ordinary' | 'taxes' | 'gold_transfer';

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
