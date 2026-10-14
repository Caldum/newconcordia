import { Button } from '@concordia/atlas/Button';
import { Field } from '@concordia/atlas/Field';
import { useId, useState } from 'react';

import { ActionFeedback } from '../../features/actions/ActionFeedback';
import { useGameAction } from '../../features/actions/useGameAction';
import styles from '../../features/economy/economy.module.css';
import { authorizeBankTransfer } from '../../features/fx/api';
import type { Authorization } from '../../features/fx/api';
import { parseAmount } from '../../features/ledger/amount';
import { useCurrentCitizen } from '../../features/shell/CurrentCitizen';
import { useMessages } from '../../i18n';

import { messages } from './messages';

/** The Economy minister authorizes one Central Bank transfer to a company located in the country. */
export function AuthorizeForm() {
  const copy = useMessages(messages);
  const citizen = useCurrentCitizen();
  const currencyId = useId();
  const [company, setCompany] = useState('');
  const [currency, setCurrency] = useState('GOLD');
  const [amountText, setAmountText] = useState('');
  const [checked, setChecked] = useState(false);
  const authorize = useGameAction(
    (_, authorization: Authorization) => authorizeBankTransfer(authorization),
    {
      refreshes: [['finances']],
      onSuccess: () => {
        setCompany('');
        setAmountText('');
        setChecked(false);
      },
    },
  );
  const amount = parseAmount(amountText);
  const valid = company.trim() !== '' && amount !== null;

  return (
    <form
      className={styles.form}
      noValidate
      onSubmit={(event) => {
        event.preventDefault();
        setChecked(true);
        if (!valid) return;
        authorize.run({ companyName: company.trim(), currency, amount });
      }}
    >
      <h3 className="at-title-3">{copy.authorizeTitle}</h3>
      <Field
        label={copy.company}
        hint={copy.companyHint}
        autoComplete="off"
        value={company}
        onChange={(event) => {
          setCompany(event.target.value);
          authorize.changed();
        }}
      />
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
            authorize.changed();
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
        error={checked && !valid ? copy.authorizeInvalid : undefined}
        onChange={(event) => {
          setAmountText(event.target.value);
          authorize.changed();
        }}
      />
      <ActionFeedback
        problem={authorize.problem}
        copy={copy}
        success={authorize.succeeded ? copy.authorized : null}
      />
      <div>
        <Button type="submit" disabled={authorize.pending}>
          {copy.authorize}
        </Button>
      </div>
    </form>
  );
}
