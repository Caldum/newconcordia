import { Button } from '@concordia/atlas/Button';
import { Panel } from '@concordia/atlas/Panel';

import { ActionFeedback } from '../../features/actions/ActionFeedback';
import type { GameAction } from '../../features/actions/useGameAction';
import type { FoundCompany } from '../../features/economy/api';
import styles from '../../features/economy/economy.module.css';
import { isRaw, useGoodName } from '../../features/economy/goods';
import { useRegionName } from '../../features/world/useNames';
import { formatNumber, useLocale, useMessages } from '../../i18n';

import { foundMessages as messages } from './messages';

interface FoundCompanySummaryProps {
  good: string;
  regionCode: string;
  action: GameAction<FoundCompany>;
}

/** What is about to be founded, what a workday yields, the cost, and the submit button. */
export function FoundCompanySummary({ good, regionCode, action }: FoundCompanySummaryProps) {
  const copy = useMessages(messages);
  const { locale } = useLocale();
  const goodName = useGoodName();
  const regionName = useRegionName();
  const yields = isRaw(good)
    ? copy.rawYield(formatNumber(10 * 0.5, locale), goodName(good).toLowerCase())
    : good === 'food_q1'
      ? copy.food
      : good === 'kit_q1'
        ? copy.kits
        : copy.weapons;

  return (
    <Panel className={styles.panel} aria-labelledby="found-summary">
      <h2 id="found-summary" className="at-title-3">
        {copy.summary}
      </h2>
      <dl className={styles.lines}>
        <div>
          <dt>{copy.what.replace(/^1\. /, '')}</dt>
          <dd>{goodName(good)}</dd>
        </div>
        <div>
          <dt>{copy.where.replace(/^2\. /, '')}</dt>
          <dd>{regionName(regionCode)}</dd>
        </div>
        <div>
          <dt>{copy.yields}</dt>
          <dd>{yields}</dd>
        </div>
        <div>
          <dt>{copy.cost}</dt>
          <dd>{copy.costValue}</dd>
        </div>
      </dl>
      <ActionFeedback problem={action.problem} copy={copy} />
      <div>
        <Button type="submit" size="large" disabled={action.pending}>
          {action.pending ? copy.founding : copy.submit}
        </Button>
      </div>
    </Panel>
  );
}
