import { Button } from '@concordia/atlas/Button';
import { Note } from '@concordia/atlas/Note';
import { Panel } from '@concordia/atlas/Panel';

import { ActionFeedback } from '../../features/actions/ActionFeedback';
import { useGameAction } from '../../features/actions/useGameAction';
import { work } from '../../features/economy/api';
import styles from '../../features/economy/economy.module.css';
import { useGoodName } from '../../features/economy/goods';
import { payslip } from '../../features/economy/payslip';
import type { Job, Workday } from '../../features/economy/queries';
import { formatMoney, formatNumber, formatPercent, useLocale, useMessages } from '../../i18n';

import { messages } from './messages';

interface PayslipProps {
  job: Job | null;
  workday: Workday | null;
}

/** Today's payslip and the button to work; once worked, what was paid and produced. */
export function Payslip({ job, workday }: PayslipProps) {
  const copy = useMessages(messages);
  const { locale } = useLocale();
  const goodName = useGoodName();
  const shift = useGameAction((key) => work(key));
  const lines = payslip(job, workday);
  const energyLeft = shift.result?.[0]?.energy ?? null;

  return (
    <Panel className={styles.panel} aria-labelledby="payslip-title">
      <h2 id="payslip-title" className="at-title-3">
        {workday ? copy.doneToday : copy.today}
      </h2>
      <dl className={styles.lines}>
        <div>
          <dt>{copy.gross}</dt>
          <dd>{formatMoney(lines.gross, locale)}</dd>
        </div>
        <div>
          <dt>{copy.tax(formatPercent(lines.taxRate, locale))}</dt>
          <dd>{formatMoney(-lines.tax, locale)}</dd>
        </div>
        <div>
          <dt>{copy.energy}</dt>
          <dd>−10</dd>
        </div>
        <div>
          <dt>{copy.net}</dt>
          <dd>{formatMoney(lines.net, locale)}</dd>
        </div>
      </dl>
      <ActionFeedback problem={shift.problem} copy={copy} />
      {workday ? (
        <div role="status">
          <Note tone="ok">{copy.paid(formatMoney(workday.net, locale))}</Note>
          <p className={styles.muted}>
            {copy.produced(formatNumber(workday.produced, locale), goodName(workday.good_code))}
          </p>
          <p className={styles.muted}>
            {energyLeft === null
              ? copy.comeBack
              : `${copy.energyLeft(energyLeft)} ${copy.comeBack}`}
          </p>
        </div>
      ) : (
        <div>
          <Button
            size="large"
            disabled={shift.pending}
            onClick={() => {
              shift.run();
            }}
          >
            {shift.pending ? copy.working : copy.work}
          </Button>
        </div>
      )}
    </Panel>
  );
}
