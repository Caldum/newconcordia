import { buttonClassName } from '@concordia/atlas/Button';
import { Note } from '@concordia/atlas/Note';
import { Panel } from '@concordia/atlas/Panel';
import { Link } from '@tanstack/react-router';

import styles from '../../features/economy/economy.module.css';
import { useMessages } from '../../i18n';

import { foundMessages as messages } from './messages';

/** Announces the new company and leads to managing it. */
export function CompanyFounded({ founded }: { founded: { name: string; region: string } | null }) {
  const copy = useMessages(messages);
  return (
    <div role="status">
      {founded ? (
        <Panel className={styles.panel}>
          <Note tone="ok">{copy.founded(founded.name, founded.region)}</Note>
          <div>
            <Link to="/companies" className={buttonClassName({})}>
              {copy.manage}
            </Link>
          </div>
        </Panel>
      ) : null}
    </div>
  );
}
