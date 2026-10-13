import { Link } from '@tanstack/react-router';

import { useMessages } from '../../i18n';
import { useIsAdmin } from '../admin/queries';

import styles from './GameShell.module.css';
import { messages } from './messages';

const current = { activeProps: { 'aria-current': 'page' as const } };

/** The main sections of the game; administration only for admins. */
export function GameNav() {
  const copy = useMessages(messages);
  const isAdmin = useIsAdmin();
  return (
    <nav aria-label={copy.nav} className={styles.nav}>
      <Link to="/" activeOptions={{ exact: true }} {...current}>
        {copy.home}
      </Link>
      <Link to="/map" {...current}>
        {copy.map}
      </Link>
      <Link to="/work" {...current}>
        {copy.economy}
      </Link>
      <Link to="/market" {...current}>
        {copy.market}
      </Link>
      <Link to="/citizenship" {...current}>
        {copy.citizenship}
      </Link>
      {isAdmin.data ? (
        <Link to="/admin" {...current}>
          {copy.admin}
        </Link>
      ) : null}
    </nav>
  );
}
