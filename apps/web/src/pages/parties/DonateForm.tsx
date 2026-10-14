import { Button } from '@concordia/atlas/Button';
import { Field } from '@concordia/atlas/Field';
import { Panel } from '@concordia/atlas/Panel';
import { useId, useState } from 'react';

import { ActionFeedback } from '../../features/actions/ActionFeedback';
import { useGameAction } from '../../features/actions/useGameAction';
import styles from '../../features/economy/economy.module.css';
import { parseAmount } from '../../features/ledger/amount';
import { donateToParty } from '../../features/politics/api';
import type { Donation } from '../../features/politics/api';
import { useCurrentCitizen } from '../../features/shell/CurrentCitizen';
import { formatMoney, useLocale, useMessages } from '../../i18n';

import { messages } from './messages';

/** Donating Gold or the national Credit to the player's party. */
export function DonateForm({ partyId }: { partyId: number }) {
  const copy = useMessages(messages);
  const { locale } = useLocale();
  const citizen = useCurrentCitizen();
  const currencyId = useId();
  const [currency, setCurrency] = useState('GOLD');
  const [amountText, setAmountText] = useState('');
  const [checked, setChecked] = useState(false);
  const donate = useGameAction((key, donation: Donation) => donateToParty(donation, key), {
    refreshes: [['parties']],
    onSuccess: () => {
      setAmountText('');
      setChecked(false);
    },
  });
  const amount = parseAmount(amountText);
  const unit = (code: string) => (code === 'GOLD' ? copy.gold : copy.credit);

  /** Any change is a new request: a new key, and the last outcome no longer applies. */
  const edit = (apply: () => void) => {
    apply();
    donate.changed();
  };

  return (
    <Panel className={styles.panel} aria-labelledby="donate-title">
      <form
        className={styles.form}
        noValidate
        onSubmit={(event) => {
          event.preventDefault();
          setChecked(true);
          if (amount === null) return;
          donate.run({ partyId, currency, amount });
        }}
      >
        <h2 id="donate-title" className="at-title-3">
          {copy.donateTitle}
        </h2>
        <p className={styles.muted}>{copy.donateHint}</p>
        <div className={styles.field}>
          <label htmlFor={currencyId} className={styles.label}>
            {copy.currency}
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
            <option value="GOLD">{copy.gold}</option>
            <option value={citizen.country_code}>{copy.credit}</option>
          </select>
        </div>
        <Field
          label={copy.amount}
          value={amountText}
          inputMode="decimal"
          autoComplete="off"
          error={checked && amount === null ? copy.amountInvalid : undefined}
          onChange={(event) => {
            edit(() => {
              setAmountText(event.target.value);
            });
          }}
        />
        <ActionFeedback
          problem={donate.problem}
          copy={copy}
          success={
            donate.succeeded && donate.variables
              ? copy.donated(
                  `${formatMoney(donate.variables.amount, locale)} ${unit(donate.variables.currency)}`,
                )
              : null
          }
        />
        <div>
          <Button type="submit" disabled={donate.pending}>
            {copy.donate}
          </Button>
        </div>
      </form>
    </Panel>
  );
}
