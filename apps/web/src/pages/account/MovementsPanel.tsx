import { Button } from '@concordia/atlas/Button';
import { Note } from '@concordia/atlas/Note';
import { Panel } from '@concordia/atlas/Panel';
import { Segmented } from '@concordia/atlas/Segmented';
import { useState } from 'react';

import type { Balance } from '../../features/ledger/queries';
import { useMovements } from '../../features/ledger/queries';
import { useCurrencyName } from '../../features/ledger/useCurrencyName';
import { useMessages } from '../../i18n';

import styles from './AccountPage.module.css';
import { messages } from './messages';
import { MovementsTable } from './MovementsTable';

/** The statement, newest first, filtered by currency, 50 movements at a time. */
export function MovementsPanel({ balances }: { balances: readonly Balance[] }) {
  const copy = useMessages(messages);
  const currencyName = useCurrencyName();
  const [currency, setCurrency] = useState<string>('all');
  const movements = useMovements(currency === 'all' ? null : currency);
  const rows = movements.data?.pages.flat() ?? [];
  // Segmented takes up to 4 options: everything, Gold, the player's Credit and one more.
  const segments = [
    { value: 'all', label: copy.all },
    ...balances.slice(0, 3).map((balance) => ({
      value: balance.currency_code,
      label: currencyName(balance.currency_code),
    })),
  ];

  return (
    <Panel className={styles.panel} aria-labelledby="movements-title">
      <div className={styles.panelHead}>
        <h2 id="movements-title" className="at-title-3">
          {copy.movements}
        </h2>
        <Segmented
          label={copy.filter}
          segments={segments}
          value={currency}
          onChange={setCurrency}
        />
      </div>
      {movements.isError ? <Note tone="error">{copy.loadFailed}</Note> : null}
      {movements.isSuccess && rows.length === 0 ? <p>{copy.noMovements}</p> : null}
      {rows.length > 0 ? <MovementsTable movements={rows} /> : null}
      {movements.hasNextPage ? (
        <div>
          <Button
            variant="secondary"
            disabled={movements.isFetchingNextPage}
            onClick={() => void movements.fetchNextPage()}
          >
            {copy.more}
          </Button>
        </div>
      ) : null}
    </Panel>
  );
}
