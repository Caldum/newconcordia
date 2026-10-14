import type { MinistryCode } from '../../features/politics/billTerms';
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
  if (bill.kind === 'ministry_allocation') {
    const ministry = String(bill.terms.ministry) as MinistryCode;
    return (
      <>
        <br />
        {copy.allocationLine(
          formatMoney(Number(bill.terms.gold), locale),
          formatMoney(Number(bill.terms.credit), locale),
          copy[`ministry_${ministry}`],
        )}
      </>
    );
  }
  if (
    bill.kind === 'alliance' ||
    bill.kind === 'break_relations' ||
    bill.kind === 'peace' ||
    bill.kind === 'embargo' ||
    bill.kind === 'lift_embargo'
  ) {
    const country = countryName(String(bill.terms.country_code));
    const embargo = bill.terms.kind === 'arms' ? copy.embargo_arms : copy.embargo_economic;
    return (
      <>
        <br />
        {bill.kind === 'embargo'
          ? copy.embargoLine(embargo, country)
          : bill.kind === 'lift_embargo'
            ? copy.liftEmbargoLine(embargo, country)
            : copy[`${bill.kind}Line`](country)}
      </>
    );
  }
  if (bill.kind === 'war_authorization') {
    return (
      <>
        <br />
        {copy.warLine(countryName(String(bill.terms.country_code)))}
      </>
    );
  }
  if (bill.kind === 'enemy_designation') {
    return (
      <>
        <br />
        {typeof bill.terms.country_code === 'string'
          ? copy.enemyLine(countryName(bill.terms.country_code))
          : copy.noEnemyLine}
      </>
    );
  }
  if (bill.kind === 'central_bank_allocation') {
    return (
      <>
        <br />
        {copy.bankAllocationLine(
          formatMoney(Number(bill.terms.gold), locale),
          formatMoney(Number(bill.terms.credit), locale),
        )}
      </>
    );
  }
  if (bill.kind === 'currency_issuance') {
    return (
      <>
        <br />
        {copy.issuanceLine(formatMoney(Number(bill.terms.amount), locale))}
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
