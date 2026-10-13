import { buttonClassName } from '@concordia/atlas/Button';
import { Link } from '@tanstack/react-router';

import { useCountryName } from '../../features/world/useNames';
import { useMessages } from '../../i18n';

import styles from './CitizenshipPage.module.css';
import { changeMessages as messages } from './messages';

/** The request went to the other country's Interior minister. */
export function RequestSent({ countryCode }: { countryCode: string }) {
  const copy = useMessages(messages);
  const countryName = useCountryName();
  return (
    <main className={styles.page}>
      <div className={styles.intro} role="status">
        <h1 className="at-title-1">{copy.sentTitle}</h1>
        <p className="at-body-l">{copy.sent(countryName(countryCode))}</p>
        <Link to="/citizenship" className={buttonClassName({ variant: 'secondary' })}>
          {copy.back}
        </Link>
      </div>
    </main>
  );
}
