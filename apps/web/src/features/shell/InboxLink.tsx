import { Icon } from '@concordia/atlas/Icon';
import { Link } from '@tanstack/react-router';

import styles from './Sidebar.module.css';

interface InboxLinkProps {
  to: '/messages' | '/notifications';
  icon: 'mail' | 'bell';
  /** What is new; a badge shows it when above zero. */
  count: number;
  /** Accessible name, with the count when there is something new. */
  label: string;
}

/** An icon leading to the messages or the notices, with a badge for what is new. */
export function InboxLink({ to, icon, count, label }: InboxLinkProps) {
  return (
    <Link
      to={to}
      className={styles.inboxLink}
      aria-label={label}
      activeProps={{ 'aria-current': 'page' }}
    >
      <Icon name={icon} size={20} />
      {count > 0 ? (
        <span className={styles.badge} aria-hidden="true">
          {count > 99 ? '99+' : count}
        </span>
      ) : null}
    </Link>
  );
}
