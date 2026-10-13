import { buttonClassName } from '@concordia/atlas/Button';
import { Link } from '@tanstack/react-router';

import { useCurrentCitizen } from '../../features/shell/CurrentCitizen';
import { useCountryName, useRegionName } from '../../features/world/useNames';
import { useMessages } from '../../i18n';

import styles from './CitizenshipPage.module.css';
import { messages } from './messages';

/** The title; right after sign-up, the welcome to the new country instead. */
export function CitizenshipIntro({ welcome }: { welcome: boolean }) {
  const copy = useMessages(messages);
  const citizen = useCurrentCitizen();
  const countryName = useCountryName();
  const regionName = useRegionName();
  const country = countryName(citizen.country_code);
  return (
    <div className={styles.intro}>
      {welcome ? (
        <>
          <h1 className="at-title-1">{copy.welcome(country, citizen.name)}</h1>
          <p className="at-body-l">{copy.welcomeBody(country, regionName(citizen.region_code))}</p>
          <Link to="/" className={buttonClassName({ size: 'large' })}>
            {copy.enter}
          </Link>
        </>
      ) : (
        <h1 className="at-title-1">{copy.title}</h1>
      )}
    </div>
  );
}
