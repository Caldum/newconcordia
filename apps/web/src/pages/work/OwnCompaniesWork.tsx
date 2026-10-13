import { Button } from '@concordia/atlas/Button';
import { Panel } from '@concordia/atlas/Panel';

import { ActionFeedback } from '../../features/actions/ActionFeedback';
import { useGameAction } from '../../features/actions/useGameAction';
import { work } from '../../features/economy/api';
import styles from '../../features/economy/economy.module.css';
import type { Company } from '../../features/economy/queries';
import { useMessages } from '../../i18n';

import { messages } from './messages';

/** The owner's management shift: working, unpaid, in one of their own companies. */
export function OwnCompaniesWork({ companies }: { companies: readonly Company[] }) {
  const copy = useMessages(messages);
  const shift = useGameAction((key, companyId: number) => work(key, companyId));
  return (
    <Panel className={styles.panel} aria-labelledby="own-title">
      <h2 id="own-title" className="at-title-3">
        {copy.ownCompanies}
      </h2>
      <p className={styles.muted}>{copy.ownCompaniesHint}</p>
      <ActionFeedback problem={shift.problem} copy={copy} />
      <div className={styles.actions}>
        {companies.map((company) => (
          <Button
            key={company.id}
            variant="secondary"
            disabled={shift.pending}
            onClick={() => {
              shift.run(company.id);
            }}
          >
            {copy.workIn(company.name)}
          </Button>
        ))}
      </div>
    </Panel>
  );
}
