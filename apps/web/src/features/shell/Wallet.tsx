import { CreditIcon, GoldIcon } from '@concordia/atlas/GameIcons';
import { Link } from '@tanstack/react-router';

import { formatMoney, useLocale, useMessages } from '../../i18n';
import { useBalances } from '../ledger/queries';

import styles from './GameShell.module.css';
import { messages } from './messages';

/** Gold and the Credit of the player's country, linking to the account. Hidden until they load. */
export function Wallet() {
  const copy = useMessages(messages);
  const { locale } = useLocale();
  const balances = useBalances();
  const [gold, credit] = balances.data ?? [];
  if (!gold || !credit) return null;
  const goldText = formatMoney(gold.balance, locale, { whole: true });
  const creditText = formatMoney(credit.balance, locale, { whole: true });
  return (
    <Link to="/account" aria-label={copy.account(goldText, creditText)} className={styles.wallet}>
      <span>
        <GoldIcon />
        {goldText}
      </span>
      <span className={styles.walletSeparator} aria-hidden="true" />
      <span>
        <CreditIcon />
        {creditText}
      </span>
    </Link>
  );
}
