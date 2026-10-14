import { Field } from '@concordia/atlas/Field';
import { Note } from '@concordia/atlas/Note';

import styles from '../../features/economy/economy.module.css';
import { taxKeys } from '../../features/politics/billTerms';
import type { TaxDraft } from '../../features/politics/billTerms';
import { useMessages } from '../../i18n';

import { messages } from './messages';

interface TaxFieldsProps {
  draft: TaxDraft;
  /** The player tried to present it with nothing changed or a value out of range. */
  invalid: boolean;
  onChange: (draft: TaxDraft) => void;
}

/** The new rates of a tax bill, in percent, and the minimum wage; blank fields stay as they are. */
export function TaxFields({ draft, invalid, onChange }: TaxFieldsProps) {
  const copy = useMessages(messages);

  return (
    <>
      <p className={styles.muted}>{copy.taxesHint}</p>
      {taxKeys.map((key) => (
        <Field
          key={key}
          label={copy.percentField(copy[`tax_${key}`])}
          inputMode="decimal"
          autoComplete="off"
          value={draft[key]}
          onChange={(event) => {
            onChange({ ...draft, [key]: event.target.value });
          }}
        />
      ))}
      <Field
        label={copy.wageField}
        inputMode="decimal"
        autoComplete="off"
        value={draft.minimum_wage}
        onChange={(event) => {
          onChange({ ...draft, minimum_wage: event.target.value });
        }}
      />
      {invalid ? <Note tone="error">{copy.taxesInvalid}</Note> : null}
    </>
  );
}
