import { Link } from '@tanstack/react-router';

import { defineMessages, useMessages } from '../../i18n';

import styles from './EconomyTabs.module.css';

const messages = defineMessages({
  es: {
    label: 'Economía',
    work: 'Empleo',
    companies: 'Mis empresas',
    found: 'Fundar empresa',
    account: 'Tu cuenta',
  },
  en: {
    label: 'Economy',
    work: 'Job',
    companies: 'My companies',
    found: 'Found a company',
    account: 'Your account',
  },
});

/** The economy section's tabs (Work, Company, FoundCompany and Inventory canvases). */
export function EconomyTabs() {
  const copy = useMessages(messages);
  const current = {
    activeProps: { 'aria-current': 'page' as const },
    activeOptions: { exact: true },
  };
  return (
    <nav aria-label={copy.label} className={styles.tabs}>
      <Link to="/work" {...current}>
        {copy.work}
      </Link>
      <Link to="/companies" {...current}>
        {copy.companies}
      </Link>
      <Link to="/companies/new" {...current}>
        {copy.found}
      </Link>
      <Link to="/account" {...current}>
        {copy.account}
      </Link>
    </nav>
  );
}
