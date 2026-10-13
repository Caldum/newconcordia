import { Button } from '@concordia/atlas/Button';
import { useId } from 'react';

import { ActionFeedback } from '../../features/actions/ActionFeedback';
import { useGameAction } from '../../features/actions/useGameAction';
import { moveGoods } from '../../features/economy/api';
import styles from '../../features/economy/economy.module.css';
import { useGoodName } from '../../features/economy/goods';
import { useCompanyStock } from '../../features/economy/queries';
import type { Company } from '../../features/economy/queries';
import { formatNumber, useLocale, useMessages } from '../../i18n';

import { messages } from './messages';

/** The depot: what the company holds, sending whole units to the owner, and points waiting for inputs. */
export function CompanyStock({ company }: { company: Company }) {
  const copy = useMessages(messages);
  const { locale } = useLocale();
  const goodName = useGoodName();
  const stock = useCompanyStock(company.id);
  const toInventory = useGameAction((_, line: { good: string; quantity: number }) =>
    moveGoods(company.id, line.good, line.quantity, true),
  );
  const titleId = useId();
  const rows = stock.data ?? [];

  return (
    <section className={styles.form} aria-labelledby={titleId}>
      <h3 id={titleId} className="at-title-3">
        {copy.stock}
      </h3>
      <ActionFeedback
        problem={toInventory.problem}
        copy={copy}
        success={toInventory.succeeded ? copy.done : null}
      />
      {stock.isSuccess && rows.length === 0 ? (
        <p className={styles.muted}>{copy.emptyStock}</p>
      ) : null}
      {rows.length > 0 ? (
        <ul className={styles.recipes}>
          {rows.map((line) => {
            const wholeUnits = Math.floor(line.quantity);
            return (
              <li key={line.good_code}>
                <span>{goodName(line.good_code)}</span>
                <strong>{formatNumber(line.quantity, locale)}</strong>
                {wholeUnits > 0 ? (
                  <Button
                    variant="ghost"
                    disabled={toInventory.pending}
                    aria-label={copy.toInventoryLabel(goodName(line.good_code))}
                    onClick={() => {
                      toInventory.run({ good: line.good_code, quantity: wholeUnits });
                    }}
                  >
                    {copy.toInventory}
                  </Button>
                ) : null}
              </li>
            );
          })}
        </ul>
      ) : null}
      {company.points > 0 ? (
        <p className={styles.muted}>{copy.pending(formatNumber(company.points, locale))}</p>
      ) : null}
    </section>
  );
}
