import { Flag, hasFlag } from '@concordia/atlas/Flag';

import { useWorld } from '../../features/world/useWorld';
import { useLocale, useMessages } from '../../i18n';

import styles from './LandingPage.module.css';
import { messages } from './messages';

/** The countries in play, as the database lists them. */
export function CountriesInPlay() {
  const copy = useMessages(messages);
  const { locale } = useLocale();
  const world = useWorld();
  if (!world.data) return null;
  const countries = [...world.data.countries.values()]
    .filter((country) => country.is_active)
    .map((country) => ({
      code: country.code,
      name: locale === 'es' ? country.name_es : country.name_en,
    }))
    .sort((a, b) => a.name.localeCompare(b.name, locale));

  return (
    <div className={styles.countries}>
      <h2 className="at-label">{copy.inPlay(countries.length)}</h2>
      <ul>
        {countries.map((country) => (
          <li key={country.code}>
            {hasFlag(country.code) ? <Flag code={country.code} width={32} /> : null}
            <span className="at-place-s">{country.name}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
