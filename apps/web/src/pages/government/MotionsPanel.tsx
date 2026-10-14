import { Panel } from '@concordia/atlas/Panel';

import styles from '../../features/economy/economy.module.css';
import { useMotions } from '../../features/politics/queries';
import { useCurrentCitizen } from '../../features/shell/CurrentCitizen';
import { useMessages } from '../../i18n';

import { messages } from './messages';
import { MotionItem } from './MotionItem';
import { ProposeMotions } from './ProposeMotions';

/** Congress's open and recent motions; members vote on them and may propose new ones. */
export function MotionsPanel({ inCongress }: { inCongress: boolean }) {
  const copy = useMessages(messages);
  const citizen = useCurrentCitizen();
  const motions = useMotions(citizen.country_code);
  const rows = motions.data ?? [];

  return (
    <Panel className={styles.panel} aria-labelledby="motions-title">
      <h2 id="motions-title" className="at-title-3">
        {copy.motionsTitle}
      </h2>
      {motions.isSuccess && rows.length === 0 ? (
        <p className={styles.muted}>{copy.noMotions}</p>
      ) : null}
      <ul className={styles.recipes}>
        {rows.map((motion) => (
          <MotionItem key={motion.motion_id} motion={motion} canVote={inCongress} />
        ))}
      </ul>
      {inCongress ? <ProposeMotions /> : null}
    </Panel>
  );
}
