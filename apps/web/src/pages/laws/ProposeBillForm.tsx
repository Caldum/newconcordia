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
import { billTerms, emptyBillDraft } from '../../features/politics/billTerms';
import type { BillDraft, BillKind } from '../../features/politics/billTerms';
import type { Initiative } from '../../features/politics/queries';
import { useOtherCountries } from '../../features/world/useOtherCountries';
import { useMessages } from '../../i18n';

import { AllocationFields } from './AllocationFields';
import { CountryField } from './CountryField';
import { EmbargoFields } from './EmbargoFields';
import { messages } from './messages';
import { TaxFields } from './TaxFields';
import { TransferFields } from './TransferFields';

const kinds: readonly BillKind[] = [
  'ordinary',
  'taxes',
  'gold_transfer',
  'ministry_allocation',
  'currency_issuance',
  'central_bank_allocation',
  'war_authorization',
  'enemy_designation',
  'alliance',
  'break_relations',
  'peace',
  'embargo',
  'lift_embargo',
];

/** Presenting a bill: its kind, title, text and terms. Once presented it cannot be withdrawn. */
export function ProposeBillForm({ initiative }: { initiative: Initiative }) {
  const copy = useMessages(messages);
  const kindId = useId();
  const [kind, setKind] = useState<BillKind>('ordinary');
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [chosen, setDraft] = useState<BillDraft>(emptyBillDraft);
  const others = useOtherCountries();
  // A country select shows the first country until the player picks one.
  const draft = { ...chosen, country: chosen.country ?? others[0] ?? null };
  const [checked, setChecked] = useState(false);
  const propose = useGameAction((key, bill: NewBill) => proposeBill(bill, key), {
    refreshes: [['laws'], ['finances']],
    onSuccess: () => {
      setTitle('');
      setBody('');
      setDraft(emptyBillDraft);
      setChecked(false);
    },
  });
  const left = initiative.allowed === null ? null : initiative.allowed - initiative.used;
  const titleValid = title.trim().length >= 3 && title.trim().length <= 120;
  const terms = billTerms(kind, draft);
  const invalid = checked && terms === null;

  /** Any change is a new request: a new key, and the last outcome no longer applies. */
  const edit = (apply: () => void) => {
    apply();
    propose.changed();
  };
  const change = (patch: Partial<BillDraft>) => {
    edit(() => {
      setDraft((current) => ({ ...current, ...patch }));
    });
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
              draft={draft.taxes}
              invalid={invalid}
              onChange={(taxes) => {
                change({ taxes });
              }}
            />
          ) : null}
          {kind === 'gold_transfer' ? (
            <TransferFields
              country={draft.country ?? ''}
              amount={draft.amount}
              invalid={invalid}
              onCountry={(country) => {
                change({ country });
              }}
              onAmount={(amount) => {
                change({ amount });
              }}
            />
          ) : null}
          {kind === 'ministry_allocation' || kind === 'central_bank_allocation' ? (
            <AllocationFields
              draft={draft}
              invalid={invalid}
              toCentralBank={kind === 'central_bank_allocation'}
              onChange={change}
            />
          ) : null}
          {kind === 'war_authorization' ? (
            <CountryField
              label={copy.target}
              value={draft.country ?? ''}
              onChange={(country) => {
                change({ country });
              }}
            />
          ) : null}
          {kind === 'enemy_designation' ? (
            <CountryField
              label={copy.enemy}
              value={draft.country ?? ''}
              noneLabel={copy.noEnemy}
              onChange={(country) => {
                change({ country });
              }}
            />
          ) : null}
          {kind === 'alliance' || kind === 'break_relations' || kind === 'peace' ? (
            <CountryField
              label={copy.country}
              value={draft.country ?? ''}
              onChange={(country) => {
                change({ country });
              }}
            />
          ) : null}
          {kind === 'embargo' || kind === 'lift_embargo' ? (
            <EmbargoFields draft={draft} onChange={change} />
          ) : null}
          {kind === 'currency_issuance' ? (
            <Field
              label={copy.issuanceAmount}
              hint={copy.issuanceHint}
              inputMode="decimal"
              autoComplete="off"
              value={draft.amount}
              error={invalid ? copy.amountInvalid : undefined}
              onChange={(event) => {
                change({ amount: event.target.value });
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
