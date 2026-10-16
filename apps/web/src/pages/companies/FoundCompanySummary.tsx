import { Button } from '@concordia/atlas/Button';
import { Note } from '@concordia/atlas/Note';
import { Panel } from '@concordia/atlas/Panel';

import { ActionFeedback } from '../../features/actions/ActionFeedback';
import type { GameAction } from '../../features/actions/useGameAction';
import type { FoundCompany } from '../../features/economy/api';
import styles from '../../features/economy/economy.module.css';
import { isRaw, useGoodName } from '../../features/economy/goods';
import { useGoldPrice } from '../../features/prices/useGoldPrice';
import { useProfile } from '../../features/profile/useProfile';
import { useCountryName, useRegionName } from '../../features/world/useNames';
import { useMessages } from '../../i18n';

import { foundMessages as messages } from './messages';

/** Civil level needed to own an N1 company (spec section 5); the database checks it again. */
const foundingCivilLevel = 5;

interface FoundCompanySummaryProps {
  good: string;
  regionCode: string | null;
  /** The host country when it is not the player's own. */
  foreignHost: string | null;
  action: GameAction<FoundCompany>;
}

/** What is about to be founded, what a shift yields, the cost, and the submit button. */
export function FoundCompanySummary({
  good,
  regionCode,
  foreignHost,
  action,
}: FoundCompanySummaryProps) {
  const copy = useMessages(messages);
  const goodName = useGoodName();
  const regionName = useRegionName();
  const countryName = useCountryName();
  const level = useProfile().data?.level;
  const price = useGoldPrice('company_level_1').price;
  const yields = isRaw(good)
    ? copy.rawYield('150', goodName(good).toLowerCase())
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
          <dd>{regionCode ? regionName(regionCode) : '—'}</dd>
        </div>
        <div>
          <dt>{copy.yields}</dt>
          <dd>{yields}</dd>
        </div>
        <div>
          <dt>{copy.cost}</dt>
          <dd>
            {foreignHost
              ? copy.foreignCost(countryName(foreignHost), price)
              : copy.costValue(price)}
          </dd>
        </div>
      </dl>
      {level !== undefined && level < foundingCivilLevel ? (
        <Note tone="info">{copy.levelNeeded(foundingCivilLevel, level)}</Note>
      ) : null}
      <ActionFeedback problem={action.problem} copy={copy} />
      <div>
        <Button type="submit" size="large" disabled={action.pending || regionCode === null}>
          {action.pending ? copy.founding : copy.submit}
        </Button>
      </div>
    </Panel>
  );
}
