import { Button } from '@concordia/atlas/Button';
import { Panel } from '@concordia/atlas/Panel';

import { ActionFeedback } from '../../features/actions/ActionFeedback';
import { useGameAction } from '../../features/actions/useGameAction';
import styles from '../../features/economy/economy.module.css';
import { claimDailyMissions } from '../../features/society/api';
import { useMissions } from '../../features/society/queries';
import { formatMoney, useLocale, useMessages } from '../../i18n';

import { missionMessages } from './missionMessages';

/** Today's four missions, their progress and the claim of the reward. */
export function MissionsPanel() {
  const copy = useMessages(missionMessages);
  const { locale } = useLocale();
  const missions = useMissions();
  const rows = missions.data ?? [];
  const claim = useGameAction(() => claimDailyMissions());
  const claimed = rows[0]?.claimed === true || claim.succeeded;
  const ready = rows.length > 0 && rows.every((m) => m.done);
  const streak = rows[0]?.streak ?? 0;

  return (
    <Panel className={styles.panel} aria-labelledby="missions-title">
      <h2 id="missions-title" className="at-title-3">
        {copy.title}
      </h2>
      <p className={styles.muted}>{copy.hint}</p>
      <ul className={styles.recipes}>
        {rows.map((m) => (
          <li key={m.mission}>
            <span>{copy[`mission_${m.mission}`]}</span>
            <span>{m.done ? copy.done : copy.progress(m.progress, m.goal)}</span>
          </li>
        ))}
      </ul>
      {streak > 0 ? <p className={styles.muted}>{copy.streak(streak)}</p> : null}
      <ActionFeedback
        problem={claim.problem}
        copy={copy}
        success={claim.result ? copy.claimed(formatMoney(claim.result.reward, locale)) : null}
      />
      {claimed ? (
        claim.succeeded ? null : (
          <p className={styles.muted}>{copy.alreadyClaimed}</p>
        )
      ) : (
        <div>
          <Button
            disabled={!ready || claim.pending}
            onClick={() => {
              claim.run();
            }}
          >
            {copy.claim}
          </Button>
        </div>
      )}
    </Panel>
  );
}
