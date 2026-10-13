import { Field } from '@concordia/atlas/Field';
import { Panel } from '@concordia/atlas/Panel';

import styles from '../../features/economy/economy.module.css';
import { useMessages } from '../../i18n';

import { foundMessages as messages } from './messages';

interface CompanyNameStepProps {
  name: string;
  invalid: boolean;
  onChange: (name: string) => void;
}

/** Step 3: the company's name. */
export function CompanyNameStep({ name, invalid, onChange }: CompanyNameStepProps) {
  const copy = useMessages(messages);
  return (
    <Panel className={styles.panel}>
      <h2 className="at-title-3">{copy.nameStep}</h2>
      <Field
        label={copy.name}
        hint={copy.nameHint}
        value={name}
        maxLength={40}
        autoComplete="off"
        error={invalid ? copy.nameMissing : undefined}
        onChange={(event) => {
          onChange(event.target.value);
        }}
      />
    </Panel>
  );
}
