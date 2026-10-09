import { Brand } from '@concordia/atlas/Brand';
import { buttonClassName } from '@concordia/atlas/Button';
import { Flag, hasFlag } from '@concordia/atlas/Flag';
import { CountryStripe } from '@concordia/atlas/Stage';
import { Link } from '@tanstack/react-router';

import { useWorld } from '../../features/world/useWorld';
import { LanguageSwitch, useLocale, useMessages } from '../../i18n';
import { useDocumentTitle } from '../../lib/useDocumentTitle';

import styles from './LandingPage.module.css';
import { messages } from './messages';

/** The countries in play, as the database lists them. */
function CountriesInPlay() {
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

/** What a visitor sees first: what the game is and how to join. */
export function LandingPage() {
  const copy = useMessages(messages);
  useDocumentTitle(copy.documentTitle);

  const day = [
    { time: '09:00', title: copy.workTitle, body: copy.workBody },
    { time: '13:00', title: copy.trainTitle, body: copy.trainBody },
    { time: '20:00', title: copy.fightTitle, body: copy.fightBody },
    { time: '22:00', title: copy.voteTitle, body: copy.voteBody },
  ];

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <Link to="/" aria-label={copy.homeLabel} className={styles.brand}>
          <Brand onInk size={34} />
        </Link>
        <nav aria-label={copy.nav} className={styles.nav}>
          <Link to="/sign-in" className={buttonClassName({ variant: 'outline-light' })}>
            {copy.signIn}
          </Link>
          <Link to="/sign-up" className={buttonClassName({ variant: 'light' })}>
            {copy.signUp}
          </Link>
        </nav>
      </header>
      <main>
        <section className={styles.hero} aria-labelledby="landing-title">
          <div className={styles.heroBody}>
            <div className={styles.heroText}>
              <h1 id="landing-title" className="at-display">
                {copy.title}
              </h1>
              <p className="at-body-l">{copy.lead}</p>
              <div className={styles.actions}>
                <Link
                  to="/sign-up"
                  className={buttonClassName({ variant: 'light', size: 'large' })}
                >
                  {copy.choose}
                </Link>
                <Link
                  to="/map"
                  className={buttonClassName({ variant: 'outline-light', size: 'large' })}
                >
                  {copy.seeMap}
                </Link>
              </div>
            </div>
            <CountriesInPlay />
          </div>
          <CountryStripe />
        </section>

        <section className={styles.section} aria-labelledby="day-title">
          <h2 id="day-title" className="at-title-1">
            {copy.dayTitle}
          </h2>
          <ol className={styles.day}>
            {day.map((moment) => (
              <li key={moment.time}>
                <span className="at-figure">{moment.time}</span>
                <h3 className="at-title-3">{moment.title}</h3>
                <p>{moment.body}</p>
              </li>
            ))}
          </ol>
        </section>

        <section className={styles.waiting} aria-labelledby="waiting-title">
          <h2 id="waiting-title" className="at-title-1">
            {copy.waitingTitle}
          </h2>
          <Link to="/sign-up" className={buttonClassName({ size: 'large' })}>
            {copy.create}
          </Link>
        </section>
      </main>

      <footer className={styles.footer} aria-label={copy.footer}>
        <Brand size={26} />
        <LanguageSwitch />
        <span className="at-support">{copy.gameTime}</span>
      </footer>
    </div>
  );
}
