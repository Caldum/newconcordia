import { Button } from '@concordia/atlas/Button';
import { Field } from '@concordia/atlas/Field';
import { useId, useState } from 'react';

import { ActionFeedback } from '../../features/actions/ActionFeedback';
import { useGameAction } from '../../features/actions/useGameAction';
import styles from '../../features/economy/economy.module.css';
import { ministryPay } from '../../features/finance/api';
import type { MinistryPayment } from '../../features/finance/api';
import { parseAmount } from '../../features/ledger/amount';
import { useCurrentCitizen } from '../../features/shell/CurrentCitizen';
import { formatMoney, useLocale, useMessages } from '../../i18n';

import { messages } from './messages';

/** The minister pays a national from the ministry, with a public concept. */
export function MinistryPayForm() {
  const copy = useMessages(messages);
  const { locale } = useLocale();
  const citizen = useCurrentCitizen();
  const currencyId = useId();
  const [currency, setCurrency] = useState(citizen.country_code);
  const [amountText, setAmountText] = useState('');
  const [name, setName] = useState('');
  const [concept, setConcept] = useState('');
  const [checked, setChecked] = useState(false);
  const pay = useGameAction((key, payment: MinistryPayment) => ministryPay(payment, key), {
    refreshes: [['finances']],
    onSuccess: () => {
      setAmountText('');
      setName('');
      setConcept('');
      setChecked(false);
    },
  });
  const amount = parseAmount(amountText);
  const valid =
    amount !== null &&
    name.trim() !== '' &&
    concept.trim().length >= 3 &&
    concept.trim().length <= 120;

  /** Any change is a new request: a new key, and the last outcome no longer applies. */
  const edit = (apply: () => void) => {
    apply();
    pay.changed();
  };

  return (
    <form
      className={styles.form}
      noValidate
      onSubmit={(event) => {
        event.preventDefault();
        setChecked(true);
        if (!valid) return;
        pay.run({ currency, amount, citizenName: name.trim(), concept: concept.trim() });
      }}
    >
      <h3 className="at-title-3">{copy.payTitle}</h3>
      <div className={styles.field}>
        <label htmlFor={currencyId} className={styles.label}>
          {copy.payCurrency}
        </label>
        <select
          id={currencyId}
          className={styles.select}
          value={currency}
          onChange={(event) => {
            edit(() => {
              setCurrency(event.target.value);
            });
          }}
        >
          <option value={citizen.country_code}>{copy.credit}</option>
          <option value="GOLD">{copy.gold}</option>
        </select>
      </div>
      <Field
        label={copy.payAmount}
        inputMode="decimal"
        autoComplete="off"
        value={amountText}
        onChange={(event) => {
          edit(() => {
            setAmountText(event.target.value);
          });
        }}
      />
      <Field
        label={copy.payCitizen}
        hint={copy.payCitizenHint}
        autoComplete="off"
        value={name}
        onChange={(event) => {
          edit(() => {
            setName(event.target.value);
          });
        }}
      />
      <Field
        label={copy.payConcept}
        hint={copy.payConceptHint}
        autoComplete="off"
        value={concept}
        error={checked && !valid ? copy.payInvalid : undefined}
        onChange={(event) => {
          edit(() => {
            setConcept(event.target.value);
          });
        }}
      />
      <ActionFeedback
        problem={pay.problem}
        copy={copy}
        success={
          pay.succeeded && pay.variables
            ? copy.paid(formatMoney(pay.variables.amount, locale), pay.variables.citizenName)
            : null
        }
      />
      <div>
        <Button type="submit" disabled={pay.pending}>
          {copy.pay}
        </Button>
      </div>
    </form>
  );
}
