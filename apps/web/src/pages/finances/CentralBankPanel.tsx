import { Button } from '@concordia/atlas/Button';
import { Field } from '@concordia/atlas/Field';
import { Panel } from '@concordia/atlas/Panel';
import { Link } from '@tanstack/react-router';
import { useId, useState } from 'react';

import { ActionFeedback } from '../../features/actions/ActionFeedback';
import { useGameAction } from '../../features/actions/useGameAction';
import styles from '../../features/economy/economy.module.css';
import { centralBankToTreasury } from '../../features/fx/api';
import type { BankTransfer } from '../../features/fx/api';
import { parseAmount } from '../../features/ledger/amount';
import { useCurrentCitizen } from '../../features/shell/CurrentCitizen';
import { formatMoney, useLocale, useMessages } from '../../i18n';

import { messages } from './messages';

/** The governor's desk: send the Central Bank's funds to the Treasury, and a way to its FX trading. */
export function CentralBankPanel() {
  const copy = useMessages(messages);
  const { locale } = useLocale();
  const citizen = useCurrentCitizen();
  const currencyId = useId();
  const [currency, setCurrency] = useState('GOLD');
  const [amountText, setAmountText] = useState('');
  const [checked, setChecked] = useState(false);
  const send = useGameAction(
    (key, transfer: BankTransfer) => centralBankToTreasury(transfer, key),
    {
      refreshes: [['finances']],
      onSuccess: () => {
        setAmountText('');
        setChecked(false);
      },
    },
  );
  const amount = parseAmount(amountText);

  return (
    <Panel className={styles.panel} aria-labelledby="bank-title">
      <form
        className={styles.form}
        noValidate
        onSubmit={(event) => {
          event.preventDefault();
          setChecked(true);
          if (amount === null) return;
          send.run({ currency, amount });
        }}
      >
        <h2 id="bank-title" className="at-title-3">
          {copy.bankTitle}
        </h2>
        <p className={styles.muted}>
          {copy.bankHint} <Link to="/market/fx">{copy.bankFxLink}</Link>
        </p>
        <div className={styles.field}>
          <label htmlFor={currencyId} className={styles.label}>
            {copy.payCurrency}
          </label>
          <select
            id={currencyId}
            className={styles.select}
            value={currency}
            onChange={(event) => {
              setCurrency(event.target.value);
              send.changed();
            }}
          >
            <option value="GOLD">{copy.gold}</option>
            <option value={citizen.country_code}>{copy.credit}</option>
          </select>
        </div>
        <Field
          label={copy.payAmount}
          inputMode="decimal"
          autoComplete="off"
          value={amountText}
          error={checked && amount === null ? copy.error_amount_invalid : undefined}
          onChange={(event) => {
            setAmountText(event.target.value);
            send.changed();
          }}
        />
        <ActionFeedback
          problem={send.problem}
          copy={copy}
          success={
            send.succeeded && send.variables
              ? copy.sentToTreasury(formatMoney(send.variables.amount, locale))
              : null
          }
        />
        <div>
          <Button type="submit" disabled={send.pending}>
            {copy.sendToTreasury}
          </Button>
        </div>
      </form>
    </Panel>
  );
}
