import { Link } from '@tanstack/react-router';

import { useMessages } from '../../i18n';

import { messages } from './messages';
import styles from './ProfilePage.module.css';

/** The profile and changing country. */
export function ProfileTabs() {
  const copy = useMessages(messages);
  return (
    <nav aria-label={copy.sections} className={styles.tabs}>
      <Link to="/profile" activeProps={{ 'aria-current': 'page' }}>
        {copy.myProfile}
      </Link>
      <Link to="/citizenship/change">{copy.changeCountry}</Link>
    </nav>
  );
}
