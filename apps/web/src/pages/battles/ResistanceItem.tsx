import { Button } from '@concordia/atlas/Button';
import { Link } from '@tanstack/react-router';

import { ActionFeedback } from '../../features/actions/ActionFeedback';
import { useGameAction } from '../../features/actions/useGameAction';
import styles from '../../features/economy/economy.module.css';
import { joinResistance } from '../../features/war/api';
import type { OccupiedRegion } from '../../features/war/queries';
import { useCountryName, useRegionName } from '../../features/world/useNames';
import { useMessages } from '../../i18n';

import { messages } from './messages';

/** One occupied region: who would get it back, how many organizers there are, and joining for 2 Gold. */
export function ResistanceItem({ region }: { region: OccupiedRegion }) {
  const copy = useMessages(messages);
  const countryName = useCountryName();
  const regionName = useRegionName();
  const name = regionName(region.region_code);
  const join = useGameAction((key) => joinResistance(region.region_code, key), {
    refreshes: [['war']],
  });

  return (
    <li>
      <span>
        <strong>
          {copy.occupiedLine(
            name,
            countryName(region.occupier_country_code),
            countryName(region.restore_country_code),
          )}
        </strong>
        <br />
        <span className={styles.muted}>
          {region.battle_id === null
            ? copy.organizers(region.organizers, region.needed)
            : copy.resistanceFighting}
        </span>
        <ActionFeedback
          problem={join.problem}
          copy={copy}
          success={join.succeeded ? copy.joined : null}
        />
      </span>
      {region.battle_id === null ? (
        region.i_organize || join.succeeded ? null : (
          <Button
            variant="secondary"
            disabled={join.pending}
            aria-label={copy.joinAria(name)}
            onClick={() => {
              join.run();
            }}
          >
            {copy.join}
          </Button>
        )
      ) : (
        <Link to="/battles/$battleId" params={{ battleId: String(region.battle_id) }}>
          {copy.follow}
        </Link>
      )}
    </li>
  );
}
