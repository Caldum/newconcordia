import { Panel } from '@concordia/atlas/Panel';

import { ActionFeedback } from '../../features/actions/ActionFeedback';
import { useGameAction } from '../../features/actions/useGameAction';
import { takeJob } from '../../features/economy/api';
import styles from '../../features/economy/economy.module.css';
import { useJobOffers } from '../../features/economy/queries';
import { useCurrentCitizen } from '../../features/shell/CurrentCitizen';
import { useCountryName } from '../../features/world/useNames';
import { useMessages } from '../../i18n';

import { JobOffersTable } from './JobOffersTable';
import { messages } from './messages';

/** The job offers of the player's country, and taking one. */
export function JobOffers({ hasJob }: { hasJob: boolean }) {
  const copy = useMessages(messages);
  const citizen = useCurrentCitizen();
  const countryName = useCountryName();
  const offers = useJobOffers();
  const take = useGameAction((_, companyId: number) => takeJob(companyId));
  const rows = offers.data ?? [];

  return (
    <Panel className={styles.panel} aria-labelledby="offers-title">
      <h2 id="offers-title" className="at-title-3">
        {copy.offers(countryName(citizen.country_code))}
      </h2>
      <p className={styles.muted}>{copy.offersHint}</p>
      <ActionFeedback problem={take.problem} copy={copy} />
      {offers.isSuccess && rows.length === 0 ? <p>{copy.noOffers}</p> : null}
      {rows.length > 0 ? (
        <JobOffersTable
          offers={rows}
          primary={!hasJob}
          onTake={(companyId) => {
            take.run(companyId);
          }}
        />
      ) : null}
    </Panel>
  );
}
