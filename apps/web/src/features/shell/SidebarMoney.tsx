import { CreditIcon, GoldIcon } from '@concordia/atlas/GameIcons';
import { Link } from '@tanstack/react-router';

import { formatMoney, useLocale, useMessages } from '../../i18n';
import { useBalances } from '../ledger/queries';
import { currencyName } from '../world/currency';

import { useCurrentCitizen } from './CurrentCitizen';
import { messages } from './messages';
import styles from './Sidebar.module.css';

/** Gold in bars and the national money by its name, leading to the account. Hidden until they load. */
export function SidebarMoney() {
  const copy = useMessages(messages);
  const { locale } = useLocale();
  const citizen = useCurrentCitizen();
  const [gold, credit] = useBalances().data ?? [];
  if (!gold || !credit) return null;
  const goldText = formatMoney(gold.balance, locale, { whole: true });
  const creditText = formatMoney(credit.balance, locale, { whole: true });
  const goldName = copy.bars(Math.trunc(gold.balance / 100));
  const moneyName =
    currencyName(
      Math.trunc(credit.balance / 100),
      credit.country_code ?? citizen.country_code,
      locale,
    ) ?? copy.credit;
  return (
    <Link
      to="/account"
      className={styles.money}
      aria-label={copy.wallet(`${goldText} ${goldName}`, `${creditText} ${moneyName}`)}
    >
      <span className={styles.amount} aria-hidden="true">
        <GoldIcon />
        <span className={styles.figure}>{goldText}</span>
        <span className={styles.unit}>{goldName}</span>
      </span>
      <span className={styles.amount} aria-hidden="true">
        <CreditIcon />
        <span className={styles.figure}>{creditText}</span>
        <span className={styles.unit}>{moneyName}</span>
      </span>
    </Link>
  );
}
