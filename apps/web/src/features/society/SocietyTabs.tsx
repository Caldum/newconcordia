import { Link } from '@tanstack/react-router';

import { defineMessages, useMessages } from '../../i18n';

import styles from './SocietyTabs.module.css';

const messages = defineMessages({
  es: { tabs: 'Sociedad', press: 'Prensa', messages: 'Mensajes' },
  en: { tabs: 'Society', press: 'Press', messages: 'Messages' },
});

const current = {
  activeProps: { 'aria-current': 'page' as const },
  activeOptions: { exact: true },
};

/** The press and private messages. */
export function SocietyTabs() {
  const copy = useMessages(messages);
  return (
    <nav aria-label={copy.tabs} className={styles.tabs}>
      <Link to="/press" {...current}>
        {copy.press}
      </Link>
      <Link to="/messages" {...current}>
        {copy.messages}
      </Link>
    </nav>
  );
}
