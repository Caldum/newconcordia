import { Link } from '@tanstack/react-router';

import { useMessages } from '../../i18n';

import { messages } from './messages';
import styles from './PoliticsTabs.module.css';

const current = {
  activeProps: { 'aria-current': 'page' as const },
  activeOptions: { exact: true },
};

/** Parties and elections, the two sides of politics. */
export function PoliticsTabs() {
  const copy = useMessages(messages);
  return (
    <nav aria-label={copy.tabs} className={styles.tabs}>
      <Link to="/parties" {...current}>
        {copy.parties}
      </Link>
      <Link to="/elections" {...current}>
        {copy.elections}
      </Link>
    </nav>
  );
}
