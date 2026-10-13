import { buttonClassName } from '@concordia/atlas/Button';
import { Panel } from '@concordia/atlas/Panel';
import { Link } from '@tanstack/react-router';

import styles from '../../features/economy/economy.module.css';
import { useMessages } from '../../i18n';

import { messages } from './messages';

/** The invitation to found the first company. */
export function NoCompanies() {
  const copy = useMessages(messages);
  return (
    <Panel className={styles.panel}>
      <p>{copy.none}</p>
      <div>
        <Link to="/companies/new" className={buttonClassName({})}>
          {copy.found}
        </Link>
      </div>
    </Panel>
  );
}
