import { Link } from '@tanstack/react-router';

import { defineMessages, useMessages } from '../../i18n';

import styles from './MilitaryTabs.module.css';

const messages = defineMessages({
  es: { tabs: 'Militar', training: 'Entrenamiento', hospital: 'Hospital', battles: 'Batallas' },
  en: { tabs: 'Military', training: 'Training', hospital: 'Hospital', battles: 'Battles' },
});

const current = {
  activeProps: { 'aria-current': 'page' as const },
  activeOptions: { exact: true },
};

/** Training, the hospital and battles. */
export function MilitaryTabs() {
  const copy = useMessages(messages);
  return (
    <nav aria-label={copy.tabs} className={styles.tabs}>
      <Link to="/training" {...current}>
        {copy.training}
      </Link>
      <Link to="/hospital" {...current}>
        {copy.hospital}
      </Link>
      <Link to="/battles" activeProps={current.activeProps}>
        {copy.battles}
      </Link>
    </nav>
  );
}
