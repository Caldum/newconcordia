import type { Balance } from '../../features/ledger/queries';
import { useCurrencyName } from '../../features/ledger/useCurrencyName';
import { useCurrentCitizen } from '../../features/shell/CurrentCitizen';
import { useCountryName } from '../../features/world/useNames';
import { formatMoney, useLocale, useMessages } from '../../i18n';

import styles from './AccountPage.module.css';
import { BalanceCard } from './BalanceCard';
import { messages } from './messages';

/** One card per currency: Gold, the Credit of the player's country, then others held. */
export function BalanceList({ balances }: { balances: readonly Balance[] }) {
  const copy = useMessages(messages);
  const { locale } = useLocale();
  const citizen = useCurrentCitizen();
  const currencyName = useCurrencyName();
  const countryName = useCountryName();
  const noteOf = (code: string) =>
    code === 'GOLD'
      ? copy.goldNote
      : code === citizen.country_code
        ? copy.ownCreditNote(countryName(code))
        : copy.otherCreditNote(countryName(code));

  return (
    <section aria-label={copy.balances} className={styles.balances}>
      {balances.map((balance) => (
        <BalanceCard
          key={balance.currency_code}
          gold={balance.currency_code === 'GOLD'}
          label={currencyName(balance.currency_code)}
          value={formatMoney(balance.balance, locale)}
          held={balance.held > 0 ? copy.held(formatMoney(balance.held, locale)) : null}
          note={noteOf(balance.currency_code)}
        />
      ))}
    </section>
  );
}
