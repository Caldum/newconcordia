import { buttonClassName } from '@concordia/atlas/Button';
import { Link } from '@tanstack/react-router';

import type { Citizen } from '../../features/auth/useCitizen';
import { GameShell } from '../../features/shell/GameShell';
import { useWorld } from '../../features/world/useWorld';
import { useLocale, useMessages } from '../../i18n';
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
    <GameShell>
      <main className={styles.main}>
        <p className={styles.eyebrow}>{copy.citizenOf(countryName)}</p>
        <h1 className="at-place-xl">{citizen.name}</h1>
        <p className="at-body-l">{copy.body}</p>
        <div className={styles.actions}>
          <Link to="/map" className={buttonClassName({ size: 'large' })}>
            {copy.openMap}
          </Link>
          <Link
            to="/citizenship"
            className={buttonClassName({ variant: 'secondary', size: 'large' })}
          >
            {copy.citizenship}
          </Link>
        </div>
      </main>
    </GameShell>
  );
}
