import { Button } from '@concordia/atlas/Button';
import { Panel } from '@concordia/atlas/Panel';

import { ActionFeedback } from '../../features/actions/ActionFeedback';
import { useGameAction } from '../../features/actions/useGameAction';
import { leaveJob } from '../../features/economy/api';
import styles from '../../features/economy/economy.module.css';
import { useGoodName } from '../../features/economy/goods';
import type { Job } from '../../features/economy/queries';
import { useRegionName } from '../../features/world/useNames';
import { formatMoney, useLocale, useMessages } from '../../i18n';

import { messages } from './messages';

/** The player's job: where, for whom, the wage, the streak and the second shift; and leaving it. */
export function JobCard({ job }: { job: Job }) {
  const copy = useMessages(messages);
  const { locale } = useLocale();
  const regionName = useRegionName();
  const goodName = useGoodName();
  const leave = useGameAction(() => leaveJob());

  return (
    <Panel className={styles.panel} aria-labelledby="job-title">
      <div className={styles.panelHead}>
        <div>
          <p className={styles.muted}>{copy.yourJob}</p>
          <h2 id="job-title" className="at-title-2">
            {job.company_name}
          </h2>
          <p className={styles.muted}>
            {`${regionName(job.region_code)} · ${goodName(job.good_code)} · ${copy.owner(job.owner_name)}`}
          </p>
        </div>
        <Button
          variant="secondary"
          disabled={leave.pending}
          onClick={() => {
            leave.run();
          }}
        >
          {copy.leave}
        </Button>
      </div>
      <ActionFeedback problem={leave.problem} copy={copy} />
      <dl className={styles.facts}>
        <div>
          <dt>{copy.wage}</dt>
          <dd>{formatMoney(job.wage, locale)}</dd>
        </div>
        <div>
          <dt>{copy.streak}</dt>
          <dd>{job.streak}</dd>
        </div>
        <div>
          <dt>{copy.secondShift}</dt>
          <dd>
            {job.second_shift_wage === null
              ? copy.notAuthorized
              : formatMoney(job.second_shift_wage, locale)}
          </dd>
        </div>
      </dl>
    </Panel>
  );
}
