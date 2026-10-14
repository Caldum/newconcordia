import { Link } from '@tanstack/react-router';

import { useMessages } from '../../i18n';

import { messages } from './messages';
import styles from './ProfilePage.module.css';

const current = {
  activeProps: { 'aria-current': 'page' as const },
  activeOptions: { exact: true },
};

/** The profile, editing it and changing country. */
export function ProfileTabs() {
  const copy = useMessages(messages);
  return (
    <nav aria-label={copy.sections} className={styles.tabs}>
      <Link to="/profile" {...current}>
        {copy.myProfile}
      </Link>
      <Link to="/profile/edit" activeProps={current.activeProps}>
        {copy.editProfile}
      </Link>
      <Link to="/citizenship/change">{copy.changeCountry}</Link>
    </nav>
  );
}
