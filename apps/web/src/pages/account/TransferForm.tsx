import { Button } from '@concordia/atlas/Button';
import { Field } from '@concordia/atlas/Field';
import { Panel } from '@concordia/atlas/Panel';
import { useState } from 'react';

import { ActionFeedback } from '../../features/actions/ActionFeedback';
import { useGameAction } from '../../features/actions/useGameAction';
import { parseAmount } from '../../features/ledger/amount';
import { transferMoney } from '../../features/ledger/api';
import type { Transfer } from '../../features/ledger/api';
import type { Balance } from '../../features/ledger/queries';
import { useCurrencyName } from '../../features/ledger/useCurrencyName';
import { useCurrentCitizen } from '../../features/shell/CurrentCitizen';
import { formatMoney, useLocale, useMessages } from '../../i18n';

import styles from './AccountPage.module.css';
import { CurrencySelect } from './CurrencySelect';
import { messages } from './messages';

/** Sending money to another citizen by name, in any currency the player holds. */
export function TransferForm({ balances }: { balances: readonly Balance[] }) {
  const copy = useMessages(messages);
  const { locale } = useLocale();
  const citizen = useCurrentCitizen();
  const currencyName = useCurrencyName();
  const [toName, setToName] = useState('');
  const [currency, setCurrency] = useState(citizen.country_code);
  const [amountText, setAmountText] = useState('');
  const [memo, setMemo] = useState('');
  const [checked, setChecked] = useState(false);
  const send = useGameAction((key, transfer: Transfer) => transferMoney(transfer, key), {
    onSuccess: () => {
      setToName('');
      setAmountText('');
      setMemo('');
      setChecked(false);
    },
  });
  const amount = parseAmount(amountText);
  const recipient = toName.trim();
  const sent = send.variables;

  /** Any change is a new request: a new key, and the last outcome no longer applies. */
  const edit = (apply: () => void) => {
    apply();
    send.changed();
  };

  return (
    <Panel className={styles.panel} aria-labelledby="transfer-title">
      <h2 id="transfer-title" className="at-title-3">
        {copy.transferTitle}
      </h2>
      <form
        className={styles.form}
        noValidate
        onSubmit={(event) => {
          event.preventDefault();
          setChecked(true);
          if (!recipient || amount === null) return;
          send.run({ toName: recipient, currency, amount, memo: memo.trim() });
        }}
      >
        <Field
          label={copy.recipient}
          hint={copy.recipientHint}
          error={checked && !recipient ? copy.recipientMissing : undefined}
          value={toName}
          autoComplete="off"
          onChange={(event) => {
            edit(() => {
              setToName(event.target.value);
            });
          }}
        />
        <CurrencySelect
          balances={balances}
          value={currency}
          onChange={(code) => {
            edit(() => {
              setCurrency(code);
            });
          }}
        />
        <Field
          label={copy.amount}
          hint={copy.amountHint}
          error={checked && amount === null ? copy.amountInvalid : undefined}
          value={amountText}
          inputMode="decimal"
          autoComplete="off"
          onChange={(event) => {
            edit(() => {
              setAmountText(event.target.value);
            });
          }}
        />
        <Field
          label={copy.memo}
          hint={copy.memoHint}
          value={memo}
          maxLength={80}
          autoComplete="off"
          onChange={(event) => {
            edit(() => {
              setMemo(event.target.value);
            });
          }}
        />
        <ActionFeedback
          problem={send.problem}
          copy={copy}
          success={
            send.succeeded && sent
              ? copy.sent(
                  formatMoney(sent.amount, locale),
                  currencyName(sent.currency),
                  sent.toName,
                )
              : null
          }
        />
        <div>
          <Button type="submit" disabled={send.pending}>
            {send.pending ? copy.sending : copy.transfer}
          </Button>
        </div>
      </form>
    </Panel>
  );
}
