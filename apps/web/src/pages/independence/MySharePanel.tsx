import { Panel } from '@concordia/atlas/Panel';

import { useMyIndependence } from '../../features/war/queries';
import { formatNumber, useLocale, useMessages } from '../../i18n';

import styles from './IndependenceWar.module.css';
import { messages } from './messages';

/** The player's damage, strikes and place among everyone who fights. */
export function MySharePanel({ warId }: { warId: number }) {
  const copy = useMessages(messages);
  const { locale } = useLocale();
  const mine = useMyIndependence(warId).data ?? null;

  return (
    <Panel aria-labelledby="mine-title" className={styles.fighter}>
      <h2 id="mine-title" className="at-title-3">
        {copy.mineTitle}
      </h2>
      <dl className={styles.stats}>
        <div>
          <dt>{copy.myDamage}</dt>
          <dd>{formatNumber(mine?.damage ?? 0, locale)}</dd>
        </div>
        <div>
          <dt>{copy.myStrikes}</dt>
          <dd>{formatNumber(mine?.strikes ?? 0, locale)}</dd>
        </div>
        <div>
          <dt>{copy.myPlace}</dt>
          <dd>{mine?.place ? copy.place(mine.place, mine.fighters) : copy.noPlace}</dd>
        </div>
      </dl>
    </Panel>
  );
}
