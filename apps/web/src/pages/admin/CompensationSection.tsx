import { Button } from '@concordia/atlas/Button';
import { Field } from '@concordia/atlas/Field';
import { Panel } from '@concordia/atlas/Panel';
import { useState } from 'react';

import { ActionFeedback } from '../../features/actions/ActionFeedback';
import { useGameAction } from '../../features/actions/useGameAction';
import { compensate } from '../../features/admin/api';
import type { Compensation } from '../../features/admin/api';
import { useTransactionLegs } from '../../features/admin/queries';
import styles from '../../features/economy/economy.module.css';
import { parseUnits } from '../../features/market/units';
import { formatMoney, useLocale, useMessages } from '../../i18n';

import { compensationMessages } from './compensationMessages';

/** Reversing a ledger transaction with a compensating one: look at its legs, give a reason, confirm. */
export function CompensationSection() {
  const copy = useMessages(compensationMessages);
  const { locale } = useLocale();
  const [idText, setIdText] = useState('');
  const [reason, setReason] = useState('');
  const id = parseUnits(idText);
  const legs = useTransactionLegs(id);
  const rows = legs.data ?? [];
  const act = useGameAction((_, request: Compensation) => compensate(request), {
    refreshes: [['me']],
  });
  const valid = id > 0 && rows.length > 0 && reason.trim().length >= 3;

  return (
    <Panel className={styles.panel} aria-labelledby="compensation-title">
      <form
        className={styles.form}
        noValidate
        onSubmit={(event) => {
          event.preventDefault();
          if (valid) act.run({ transactionId: id, reason: reason.trim() });
        }}
      >
        <h2 id="compensation-title" className="at-title-3">
          {copy.title}
        </h2>
        <p className={styles.muted}>{copy.hint}</p>
        <Field
          label={copy.transaction}
          inputMode="numeric"
          autoComplete="off"
          value={idText}
          onChange={(event) => {
            setIdText(event.target.value);
            act.changed();
          }}
        />
        {id > 0 && legs.isSuccess && rows.length === 0 ? (
          <p className={styles.muted}>{copy.notFound}</p>
        ) : null}
        <ul className={styles.recipes}>
          {rows.map((leg, index) => (
            <li key={`${String(index)}-${leg.debit}-${leg.credit}`}>
              {copy.leg(
                leg.posting_kind,
                formatMoney(leg.amount, locale),
                leg.currency_code,
                leg.debit,
                leg.credit,
              )}
            </li>
          ))}
        </ul>
        {rows[0]?.compensated_by ? (
          <p className={styles.muted}>{copy.already(rows[0].compensated_by)}</p>
        ) : null}
        <Field
          label={copy.reason}
          hint={copy.reasonHint}
          autoComplete="off"
          value={reason}
          onChange={(event) => {
            setReason(event.target.value);
            act.changed();
          }}
        />
        <ActionFeedback
          problem={act.problem}
          copy={copy}
          success={typeof act.result === 'number' ? copy.done(act.result) : null}
        />
        <div>
          <Button type="submit" disabled={!valid || act.pending}>
            {copy.compensate}
          </Button>
        </div>
      </form>
    </Panel>
  );
}
