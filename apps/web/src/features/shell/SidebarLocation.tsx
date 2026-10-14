import { Icon } from '@concordia/atlas/Icon';
import { Link } from '@tanstack/react-router';

import { useMessages } from '../../i18n';
import { useCountryName, useRegionName, useRegionOwner } from '../world/useNames';

import { useCurrentCitizen } from './CurrentCitizen';
import { messages } from './messages';
import styles from './Sidebar.module.css';

/** Where the player is now, and the way to travel. */
export function SidebarLocation() {
  const copy = useMessages(messages);
  const citizen = useCurrentCitizen();
  const regionName = useRegionName();
  const countryName = useCountryName();
  const regionOwner = useRegionOwner();
  return (
    <div className={styles.location}>
      <span className={styles.place}>
        <Icon name="pin" size={18} />
        <span>
          <span className={styles.unit}>{copy.youAreIn}</span>
          <span className={styles.placeName}>
            {`${regionName(citizen.region_code)}, ${countryName(regionOwner(citizen.region_code))}`}
          </span>
        </span>
      </span>
      <Link to="/travel" className={styles.travelLink}>
        {copy.travel}
      </Link>
    </div>
  );
}
