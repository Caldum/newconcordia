import { Link } from '@tanstack/react-router';

import { defineMessages, useMessages } from '../../i18n';

import styles from './MilitaryTabs.module.css';

const messages = defineMessages({
  es: { tabs: 'Militar', training: 'Entrenamiento', hospital: 'Hospital' },
  en: { tabs: 'Military', training: 'Training', hospital: 'Hospital' },
});

const current = {
  activeProps: { 'aria-current': 'page' as const },
  activeOptions: { exact: true },
};

/** Training and the hospital; battles join them in Stage 4. */
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
    </nav>
  );
}
