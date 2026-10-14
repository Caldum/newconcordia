import type { Bill } from '../../features/politics/queries';
import { useCountryName } from '../../features/world/useNames';
import { formatMoney, formatPercent, useLocale, useMessages } from '../../i18n';

import { messages } from './messages';

const taxOrder = ['vat', 'tariff', 'work_tax', 'export_tax', 'minimum_wage'] as const;

/** What a bill changes: the new taxes, or the Gold it sends and where. Ordinary laws show nothing here. */
export function BillTerms({ bill }: { bill: Bill }) {
  const copy = useMessages(messages);
  const { locale } = useLocale();
  const countryName = useCountryName();

  if (bill.kind === 'gold_transfer') {
    return (
      <>
        <br />
        {copy.transferLine(
          formatMoney(Number(bill.terms.amount), locale),
          countryName(String(bill.terms.country_code)),
        )}
      </>
    );
  }
  if (bill.kind !== 'taxes') return null;
  const lines = taxOrder
    .filter((key) => key in bill.terms)
    .map((key) => {
      const value = Number(bill.terms[key]);
      return copy.taxLine(
        copy[`tax_${key}`],
        key === 'minimum_wage' ? formatMoney(value, locale) : formatPercent(value, locale, 2),
      );
    });
  return (
    <>
      <br />
      {lines.join(' · ')}
    </>
  );
}
