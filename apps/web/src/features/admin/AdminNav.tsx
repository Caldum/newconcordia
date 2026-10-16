import { Link } from '@tanstack/react-router';

import { useMessages } from '../../i18n';

import styles from './AdminShell.module.css';
import { useCurrentStaff } from './CurrentStaff';
import { consoleMessages } from './messages';

const current = { activeProps: { 'aria-current': 'page' as const } };

/** The console's sections: moderation for the whole staff, the rest for admins. */
export function AdminNav() {
  const copy = useMessages(consoleMessages);
  const staff = useCurrentStaff();
  const admin = staff.role === 'admin';
  return (
    <nav aria-label={copy.nav} className={styles.nav}>
      <Link to="/admin" activeOptions={{ exact: true }} {...current}>
        {copy.overview}
      </Link>
      <Link to="/admin/reports" {...current}>
        {copy.reports}
      </Link>
      <Link to="/admin/citizens" {...current}>
        {copy.citizens}
      </Link>
      <Link to="/admin/sanctions" {...current}>
        {copy.sanctions}
      </Link>
      {admin ? (
        <>
          <Link to="/admin/gold" {...current}>
            {copy.gold}
          </Link>
          <Link to="/admin/params" {...current}>
            {copy.params}
          </Link>
          <Link to="/admin/economy" {...current}>
            {copy.economy}
          </Link>
          <Link to="/admin/world" {...current}>
            {copy.world}
          </Link>
          <Link to="/admin/access" {...current}>
            {copy.access}
          </Link>
          <Link to="/admin/log" {...current}>
            {copy.log}
          </Link>
        </>
      ) : null}
    </nav>
  );
}
