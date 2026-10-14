import { Button } from '@concordia/atlas/Button';
import { Panel } from '@concordia/atlas/Panel';

import { ActionFeedback } from '../../features/actions/ActionFeedback';
import { useGameAction } from '../../features/actions/useGameAction';
import styles from '../../features/economy/economy.module.css';
import { train, upgradeCenter } from '../../features/training/api';
import type { TrainingCenter } from '../../features/training/queries';
import { formatMoney, formatPercent, useLocale, useMessages } from '../../i18n';

import { messages } from './messages';

/** One center: level, what a session costs and gives, the session button and the upgrade. */
export function TrainingCenterPanel({ center }: { center: TrainingCenter }) {
  const copy = useMessages(messages);
  const { locale } = useLocale();
  const name = copy[`center_${center.kind}`];
  const session = useGameAction(() => train(center.kind));
  const upgrade = useGameAction((key) => upgradeCenter(center.kind, key));
  const fee = center.fee > 0 ? formatMoney(center.fee, locale) : '';
  const cost = center.upgrade_cost === null ? null : formatMoney(center.upgrade_cost, locale);
  const result = session.result;
  const titleId = `center-${center.kind}`;

  return (
    <Panel className={styles.panel} aria-labelledby={titleId}>
      <div className={styles.panelHead}>
        <h2 id={titleId} className="at-title-3">
          {name}
        </h2>
        <span>{copy.level(center.level)}</span>
      </div>
      <p>
        {copy.gain(center.strength)} · {copy.cost(center.energy, fee)}
        <br />
        <span className={styles.muted}>
          {copy.injury(formatPercent(center.injury_chance, locale, 2))}
        </span>
      </p>
      <ActionFeedback
        problem={session.problem}
        copy={copy}
        success={
          result
            ? result.health_lost > 0
              ? copy.trainedInjured(result.strength_gained, result.health_lost)
              : copy.trained(result.strength_gained)
            : null
        }
      />
      {center.trained_today && !result ? <p className={styles.muted}>{copy.trainedToday}</p> : null}
      <div className={styles.actions}>
        <Button
          disabled={center.trained_today || session.pending || session.succeeded}
          aria-label={copy.trainAria(name)}
          onClick={() => {
            session.run();
          }}
        >
          {copy.train}
        </Button>
        {cost === null ? (
          <span className={styles.muted}>{copy.levelMax}</span>
        ) : (
          <Button
            variant="secondary"
            disabled={upgrade.pending}
            aria-label={copy.upgradeAria(name, cost)}
            onClick={() => {
              upgrade.run();
            }}
          >
            {copy.upgrade(cost)}
          </Button>
        )}
      </div>
      <ActionFeedback
        problem={upgrade.problem}
        copy={copy}
        success={typeof upgrade.result === 'number' ? copy.upgraded(upgrade.result) : null}
      />
    </Panel>
  );
}
