import { Brand } from '@concordia/atlas/Brand';
import { Button, buttonClassName } from '@concordia/atlas/Button';
import { Link } from '@tanstack/react-router';

import type { Citizen } from '../../features/auth/useCitizen';
import { useWorld } from '../../features/world/useWorld';
import { LanguageSwitch, useLocale, useMessages } from '../../i18n';
import { supabase } from '../../lib/supabase';
import { useDocumentTitle } from '../../lib/useDocumentTitle';

import styles from './HomePage.module.css';
import { messages } from './messages';

/** The signed-in player's start screen until the game home arrives (D08). */
export function HomePage({ citizen }: { citizen: Citizen }) {
  const copy = useMessages(messages);
  const { locale } = useLocale();
  useDocumentTitle(copy.documentTitle);
  const world = useWorld();
  const country = world.data?.countries.get(citizen.country_code);
  const countryName = country
    ? locale === 'es'
      ? country.name_es
      : country.name_en
    : citizen.country_code;

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <Link to="/" aria-label={copy.homeLabel} className={styles.brand}>
          <Brand size={30} />
        </Link>
        <nav aria-label={copy.nav}>
          <Link to="/map">{copy.map}</Link>
        </nav>
        <div className={styles.tools}>
          <LanguageSwitch />
          <Button
            variant="ghost"
            icon="logout"
            onClick={() => {
              void supabase.auth.signOut();
            }}
          >
            {copy.signOut}
          </Button>
        </div>
      </header>
      <main className={styles.main}>
        <p className={styles.eyebrow}>{copy.citizenOf(countryName)}</p>
        <h1 className="at-place-xl">{citizen.name}</h1>
        <p className="at-body-l">{copy.body}</p>
        <Link to="/map" className={buttonClassName({ size: 'large' })}>
          {copy.openMap}
        </Link>
      </main>
    </div>
  );
}
