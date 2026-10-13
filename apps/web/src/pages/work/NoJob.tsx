import { Panel } from '@concordia/atlas/Panel';

import styles from '../../features/economy/economy.module.css';
import { useMessages } from '../../i18n';

import { messages } from './messages';

/** In place of the job card while the player has none. */
export function NoJob() {
  const copy = useMessages(messages);
  return (
    <Panel className={styles.panel}>
      <p>{copy.noJob}</p>
    </Panel>
  );
}
