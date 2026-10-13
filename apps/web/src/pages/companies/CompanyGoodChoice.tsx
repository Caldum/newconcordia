import { Panel } from '@concordia/atlas/Panel';

import styles from '../../features/economy/economy.module.css';
import { isRaw, useGoodName } from '../../features/economy/goods';
import { useMessages } from '../../i18n';

import { foundMessages as messages } from './messages';
import { foundableGoods } from './useFoundCompanyForm';
import type { FoundableGood } from './useFoundCompanyForm';

interface CompanyGoodChoiceProps {
  good: FoundableGood;
  onChange: (good: FoundableGood) => void;
}

/** Step 1: what the company makes. */
export function CompanyGoodChoice({ good, onChange }: CompanyGoodChoiceProps) {
  const copy = useMessages(messages);
  const goodName = useGoodName();
  return (
    <Panel className={styles.panel}>
      <fieldset className={styles.form}>
        <legend className="at-title-3">{copy.what}</legend>
        {foundableGoods.map((code) => (
          <label key={code} className={styles.actions}>
            <input
              type="radio"
              name="good"
              value={code}
              checked={good === code}
              onChange={() => {
                onChange(code);
              }}
            />
            <span>{goodName(code)}</span>
            <span className={styles.muted}>{isRaw(code) ? copy.raw : copy.product}</span>
          </label>
        ))}
      </fieldset>
    </Panel>
  );
}
