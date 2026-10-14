import { Note } from '@concordia/atlas/Note';

import styles from '../../features/economy/economy.module.css';
import { useMyParty, useParties } from '../../features/politics/queries';
import { useCurrentCitizen } from '../../features/shell/CurrentCitizen';
import { useCountryName } from '../../features/world/useNames';
import { useMessages } from '../../i18n';
import { useDocumentTitle } from '../../lib/useDocumentTitle';

import { FoundPartyForm } from './FoundPartyForm';
import { messages } from './messages';
import { MyParty } from './MyParty';
import { PartiesList } from './PartiesList';

/** `/parties`: the country's parties, the player's own (or founding one) and its leader election. */
export function PartiesPage() {
  const copy = useMessages(messages);
  useDocumentTitle(copy.documentTitle);
  const citizen = useCurrentCitizen();
  const countryName = useCountryName();
  const parties = useParties(citizen.country_code);
  const myParty = useMyParty();
  const mine = parties.data?.find((party) => party.party_id === myParty.data?.party_id) ?? null;

  return (
    <main className={styles.page}>
      <div className={styles.intro}>
        <h1 className="at-title-1">{copy.title(countryName(citizen.country_code))}</h1>
        <p className="at-body-l">{copy.intro}</p>
      </div>
      {parties.isError || myParty.isError ? <Note tone="error">{copy.loadFailed}</Note> : null}
      {parties.isSuccess && myParty.isSuccess ? (
        <div className={styles.layout}>
          <div className={styles.column}>
            {mine && myParty.data ? (
              <MyParty party={mine} isLeader={myParty.data.is_leader} />
            ) : (
              <FoundPartyForm />
            )}
          </div>
          <PartiesList parties={parties.data} inParty={myParty.data !== null} />
        </div>
      ) : null}
    </main>
  );
}
