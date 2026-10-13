import { Note } from '@concordia/atlas/Note';

import { EconomyTabs } from '../../features/economy/EconomyTabs';
import { InventoryPanel } from '../../features/inventory/InventoryPanel';
import { useBalances } from '../../features/ledger/queries';
import { useMessages } from '../../i18n';
import { useDocumentTitle } from '../../lib/useDocumentTitle';

import styles from './AccountPage.module.css';
import { BalanceList } from './BalanceList';
import { messages } from './messages';
import { MovementsPanel } from './MovementsPanel';
import { TransferForm } from './TransferForm';

/** `/account`: balances, items, the statement and transfers (Inventory canvas). */
export function AccountPage() {
  const copy = useMessages(messages);
  useDocumentTitle(copy.documentTitle);
  const balances = useBalances();

  return (
    <main className={styles.page}>
      <EconomyTabs />
      <div className={styles.intro}>
        <h1 className="at-title-1">{copy.title}</h1>
        <p className="at-body-l">{copy.intro}</p>
      </div>
      {balances.isError ? <Note tone="error">{copy.loadFailed}</Note> : null}
      {balances.data ? (
        <>
          <BalanceList balances={balances.data} />
          <InventoryPanel />
          <div className={styles.layout}>
            <MovementsPanel balances={balances.data} />
            <TransferForm balances={balances.data} />
          </div>
        </>
      ) : null}
    </main>
  );
}
