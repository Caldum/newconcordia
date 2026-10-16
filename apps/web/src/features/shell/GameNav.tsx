import { Link } from '@tanstack/react-router';

import { useMessages } from '../../i18n';

import styles from './GameShell.module.css';
import { messages } from './messages';

const current = { activeProps: { 'aria-current': 'page' as const } };

/** The main sections of the game. The administration is apart, at /admin (ADR 0049). */
export function GameNav() {
  const copy = useMessages(messages);
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
      <Link to="/training" {...current}>
        {copy.military}
      </Link>
      <Link to="/parties" {...current}>
        {copy.politics}
      </Link>
      <Link to="/press" {...current}>
        {copy.society}
      </Link>
      <Link to="/citizenship" {...current}>
        {copy.citizenship}
      </Link>
    </nav>
  );
}
