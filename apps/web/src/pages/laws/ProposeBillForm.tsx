import { Button } from '@concordia/atlas/Button';
import { Field } from '@concordia/atlas/Field';
import { Note } from '@concordia/atlas/Note';
import { Panel } from '@concordia/atlas/Panel';
import { useId, useState } from 'react';

import { ActionFeedback } from '../../features/actions/ActionFeedback';
import { useGameAction } from '../../features/actions/useGameAction';
import styles from '../../features/economy/economy.module.css';
import { proposeBill } from '../../features/politics/api';
import type { NewBill } from '../../features/politics/api';
import { emptyTaxDraft, taxTerms, transferTerms } from '../../features/politics/billTerms';
import type { BillKind, TaxDraft } from '../../features/politics/billTerms';
import type { Initiative } from '../../features/politics/queries';
import { useMessages } from '../../i18n';

import { messages } from './messages';
import { TaxFields } from './TaxFields';
import { TransferFields } from './TransferFields';

const kinds: readonly BillKind[] = ['ordinary', 'taxes', 'gold_transfer'];

/** Presenting a bill: its kind, title, text and terms. Once presented it cannot be withdrawn. */
export function ProposeBillForm({ initiative }: { initiative: Initiative }) {
  const copy = useMessages(messages);
  const kindId = useId();
  const [kind, setKind] = useState<BillKind>('ordinary');
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [taxes, setTaxes] = useState<TaxDraft>(emptyTaxDraft);
  const [country, setCountry] = useState<string | null>(null);
  const [amount, setAmount] = useState('');
  const [checked, setChecked] = useState(false);
  const propose = useGameAction((key, bill: NewBill) => proposeBill(bill, key), {
    refreshes: [['laws']],
    onSuccess: () => {
      setTitle('');
      setBody('');
      setTaxes(emptyTaxDraft);
      setAmount('');
      setChecked(false);
    },
  });
  const left = initiative.allowed === null ? null : initiative.allowed - initiative.used;
  const titleValid = title.trim().length >= 3 && title.trim().length <= 120;
  const terms =
    kind === 'taxes'
      ? taxTerms(taxes)
      : kind === 'gold_transfer'
        ? transferTerms(country, amount)
        : {};

  /** Any change is a new request: a new key, and the last outcome no longer applies. */
  const edit = (apply: () => void) => {
    apply();
    propose.changed();
  };

  return (
    <Panel className={styles.panel} aria-labelledby="propose-bill-title">
      <h2 id="propose-bill-title" className="at-title-3">
        {copy.proposeTitle}
      </h2>
      <p className={styles.muted}>
        {left === null ? copy.initiativeUnlimited : copy.initiativeLeft(left)} {copy.proposeHint}
      </p>
      <ActionFeedback
        problem={propose.problem}
        copy={copy}
        success={propose.succeeded ? copy.proposed : null}
      />
      {left === 0 ? (
        <Note tone="info">{copy.initiativeNone}</Note>
      ) : (
        <form
          className={styles.form}
          noValidate
          onSubmit={(event) => {
            event.preventDefault();
            setChecked(true);
            if (!titleValid || terms === null) return;
            propose.run({ kind, title: title.trim(), body: body.trim(), terms });
          }}
        >
          <div className={styles.field}>
            <label htmlFor={kindId} className={styles.label}>
              {copy.kind}
            </label>
            <select
              id={kindId}
              className={styles.select}
              value={kind}
              onChange={(event) => {
                edit(() => {
                  setKind(event.target.value as BillKind);
                });
              }}
            >
              {kinds.map((code) => (
                <option key={code} value={code}>
                  {copy[`kind_${code}`]}
                </option>
              ))}
            </select>
          </div>
          <Field
            label={copy.billTitle}
            value={title}
            autoComplete="off"
            error={checked && !titleValid ? copy.billTitleMissing : undefined}
            onChange={(event) => {
              edit(() => {
                setTitle(event.target.value);
              });
            }}
          />
          <Field
            label={copy.body}
            hint={copy.bodyHint}
            value={body}
            autoComplete="off"
            onChange={(event) => {
              edit(() => {
                setBody(event.target.value);
              });
            }}
          />
          {kind === 'taxes' ? (
            <TaxFields
              draft={taxes}
              invalid={checked && terms === null}
              onChange={(draft) => {
                edit(() => {
                  setTaxes(draft);
                });
              }}
            />
          ) : null}
          {kind === 'gold_transfer' ? (
            <TransferFields
              country={country}
              amount={amount}
              invalid={checked && terms === null}
              onCountry={(code) => {
                edit(() => {
                  setCountry(code);
                });
              }}
              onAmount={(text) => {
                edit(() => {
                  setAmount(text);
                });
              }}
            />
          ) : null}
          <div>
            <Button type="submit" disabled={propose.pending}>
              {copy.propose}
            </Button>
          </div>
        </form>
      )}
    </Panel>
  );
}
