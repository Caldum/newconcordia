import { Button } from '@concordia/atlas/Button';
import { Panel } from '@concordia/atlas/Panel';

import { ActionFeedback } from '../../features/actions/ActionFeedback';
import { useGameAction } from '../../features/actions/useGameAction';
import styles from '../../features/economy/economy.module.css';
import { Avatar } from '../../features/profile/Avatar';
import { joinRegiment } from '../../features/regiments/api';
import type { Regiment } from '../../features/regiments/queries';
import { useMessages } from '../../i18n';

import { messages } from './messages';
import own from './Regiments.module.css';

interface RegimentListProps {
  regiments: readonly Regiment[];
  /** The player is in a regiment already: joining another is not offered. */
  inRegiment: boolean;
}

/** Every regiment of the country, largest first, with its picture, leader and joining. */
export function RegimentList({ regiments, inRegiment }: RegimentListProps) {
  const copy = useMessages(messages);
  const join = useGameAction((_, regiment: Regiment) => joinRegiment(regiment.regiment_id), {
    refreshes: [['regiments']],
  });
  return (
    <Panel className={styles.panel} aria-labelledby="regiments-title">
      <h2 id="regiments-title" className="at-title-3">
        {copy.listTitle}
      </h2>
      <ActionFeedback
        problem={join.problem}
        copy={copy}
        success={join.succeeded && join.variables ? copy.joined(join.variables.name) : null}
      />
      {regiments.length === 0 ? <p className={styles.muted}>{copy.none}</p> : null}
      <ul className={styles.recipes}>
        {regiments.map((regiment) => (
          <li key={regiment.regiment_id}>
            <span className={own.row}>
              <Avatar name={regiment.name} path={regiment.emblem_path} size={40} />
              <span>
                <strong>{regiment.name}</strong>
                <br />
                <span className={styles.muted}>
                  {copy.members(regiment.members)}
                  {regiment.leader ? ` · ${copy.leads(regiment.leader)}` : null}
                </span>
              </span>
            </span>
            {inRegiment ? null : (
              <Button
                variant="secondary"
                disabled={join.pending}
                aria-label={copy.joinLabel(regiment.name)}
                onClick={() => {
                  join.run(regiment);
                }}
              >
                {copy.join}
              </Button>
            )}
          </li>
        ))}
      </ul>
    </Panel>
  );
}
