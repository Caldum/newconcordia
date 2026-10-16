import { Button } from '@concordia/atlas/Button';
import { Field } from '@concordia/atlas/Field';
import { useState } from 'react';

import { useGameAction } from '../../features/actions/useGameAction';
import { setParam } from '../../features/admin/api';
import type { ParamChange } from '../../features/admin/api';
import { ConsoleFeedback } from '../../features/admin/ConsoleFeedback';
import { parseParamValue } from '../../features/admin/goldSplit';
import type { BalanceParam } from '../../features/admin/queries';
import { formatDateTime, useLocale, useMessages } from '../../i18n';

import styles from './AdminPage.module.css';
import { paramMessages } from './paramMessages';

/** One balance parameter: its key, what it does, its value and changing it with a reason. */
export function ParamItem({ param }: { param: BalanceParam }) {
  const copy = useMessages(paramMessages);
  const { locale } = useLocale();
  const [valueText, setValueText] = useState(() =>
    locale === 'es' ? String(param.value).replace('.', ',') : String(param.value),
  );
  const [reason, setReason] = useState('');
  const save = useGameAction((_, change: ParamChange) => setParam(change), {
    onSuccess: () => {
      setReason('');
    },
  });
  const value = parseParamValue(valueText);
  return (
    <li>
      <div>
        <strong>
          <code>{param.key}</code>
        </strong>
        <br />
        <span className={styles.meta}>
          {param.description} · {copy.updated(formatDateTime(param.updated_at, locale))}
        </span>
      </div>
      {param.managed ? (
        <span className={styles.meta}>{copy.managed}</span>
      ) : (
        <form
          className={styles.row}
          noValidate
          aria-label={param.key}
          onSubmit={(event) => {
            event.preventDefault();
            if (value === null) return;
            save.run({ key: param.key, value, reason: reason.trim() });
          }}
        >
          <Field
            label={copy.value}
            inputMode="decimal"
            autoComplete="off"
            value={valueText}
            error={value === null ? copy.invalidValue : undefined}
            onChange={(event) => {
              setValueText(event.target.value);
              save.changed();
            }}
          />
          <Field
            label={copy.reason}
            autoComplete="off"
            maxLength={300}
            value={reason}
            onChange={(event) => {
              setReason(event.target.value);
              save.changed();
            }}
          />
          <Button type="submit" disabled={save.pending || value === null}>
            {copy.save}
          </Button>
        </form>
      )}
      <ConsoleFeedback
        problem={save.problem}
        copy={copy}
        success={save.succeeded ? copy.saved : null}
      />
    </li>
  );
}
