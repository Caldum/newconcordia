import { Panel } from '@concordia/atlas/Panel';

import styles from '../../features/economy/economy.module.css';
import { removePartyEmblem, uploadPartyEmblem } from '../../features/politics/api';
import type { Party } from '../../features/politics/queries';
import { PictureField } from '../../features/profile/PictureField';
import { useProfileDetails } from '../../features/profile/queries';
import { useMessages } from '../../i18n';

import { messages } from './messages';

/** The party picture, which its leader chooses; it shows on the members' profiles. */
export function PartyEmblemPanel({ party }: { party: Party }) {
  const copy = useMessages(messages);
  const details = useProfileDetails().data;
  return (
    <Panel className={styles.panel} aria-labelledby="party-emblem-title">
      <h2 id="party-emblem-title" className="at-title-3">
        {copy.emblemTitle}
      </h2>
      <PictureField
        name={party.name}
        path={details?.party_id === party.party_id ? details.party_emblem_path : null}
        store={(file) => uploadPartyEmblem(party.party_id, file)}
        clear={removePartyEmblem}
      />
    </Panel>
  );
}
