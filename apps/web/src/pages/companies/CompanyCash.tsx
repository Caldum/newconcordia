import { Button } from '@concordia/atlas/Button';
import { Field } from '@concordia/atlas/Field';
import { useState } from 'react';

import { ActionFeedback } from '../../features/actions/ActionFeedback';
import { useGameAction } from '../../features/actions/useGameAction';
import { moveCompanyCash } from '../../features/economy/api';
import styles from '../../features/economy/economy.module.css';
import type { Company } from '../../features/economy/queries';
import { parseAmount } from '../../features/ledger/amount';
import { formatMoney, useLocale, useMessages } from '../../i18n';

import { messages } from './messages';

type Direction = 'deposit' | 'withdraw';

/** The company's cash: how many workdays it pays, and moving money in or out of it. */
export function CompanyCash({ company }: { company: Company }) {
  const copy = useMessages(messages);
  const { locale } = useLocale();
  const [amountText, setAmountText] = useState('');
  const [checked, setChecked] = useState(false);
  const amount = parseAmount(amountText);
  const move = useGameAction(
    (key, { direction, value }: { direction: Direction; value: number }) =>
      moveCompanyCash(direction, company.id, value, key),
    {
      onSuccess: () => {
        setAmountText('');
        setChecked(false);
      },
    },
  );

  const submit = (direction: Direction) => {
    setChecked(true);
    if (amount !== null) move.run({ direction, value: amount });
  };

  return (
    <section className={styles.form} aria-label={copy.cash}>
      <h3 className="at-title-3">{copy.cash}</h3>
      <p className="at-figure">{formatMoney(company.cash, locale)}</p>
      {company.wage > 0 ? (
        <p className={styles.muted}>{copy.days(Math.floor(company.cash / company.wage))}</p>
      ) : null}
      <p className={styles.muted}>{copy.cashHint}</p>
      <Field
        label={copy.amount}
        value={amountText}
        inputMode="decimal"
        autoComplete="off"
        error={checked && amount === null ? copy.amountInvalid : undefined}
        onChange={(event) => {
          setAmountText(event.target.value);
          move.changed();
        }}
      />
      <div className={styles.actions}>
        <Button
          disabled={move.pending}
          onClick={() => {
            submit('deposit');
          }}
        >
          {copy.deposit}
        </Button>
        <Button
          variant="secondary"
          disabled={move.pending}
          onClick={() => {
            submit('withdraw');
          }}
        >
          {copy.withdraw}
        </Button>
      </div>
      <ActionFeedback
        problem={move.problem}
        copy={copy}
        success={move.succeeded ? copy.done : null}
      />
    </section>
  );
}
