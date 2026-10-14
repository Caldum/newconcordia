import { Panel } from '@concordia/atlas/Panel';

import styles from '../../features/economy/economy.module.css';
import { useForeignRelations } from '../../features/politics/queries';
import type { ForeignRelation } from '../../features/politics/queries';
import { useCurrentCitizen } from '../../features/shell/CurrentCitizen';
import { useCountryName } from '../../features/world/useNames';
import { useMessages } from '../../i18n';

import { messages } from './messages';

/** Alliances, offers, broken relations, embargoes and enemies, both ways. */
export function ForeignRelationsPanel() {
  const copy = useMessages(messages);
  const citizen = useCurrentCitizen();
  const countryName = useCountryName();
  const relations = useForeignRelations(citizen.country_code);
  const rows = relations.data ?? [];
  const line = (r: ForeignRelation) => {
    const country = countryName(r.other_country_code);
    const side = r.ours ? 'ours' : 'theirs';
    switch (r.relation) {
      case 'alliance':
        return copy.relation_alliance(country);
      case 'embargo':
        return copy[`relation_embargo_${side}`](
          country,
          r.detail === 'arms' ? copy.embargo_arms : copy.embargo_economic,
        );
      default:
        return copy[`relation_${r.relation}_${side}`](country);
    }
  };

  return (
    <Panel className={styles.panel} aria-labelledby="relations-title">
      <h2 id="relations-title" className="at-title-3">
        {copy.relationsTitle}
      </h2>
      {relations.isSuccess && rows.length === 0 ? (
        <p className={styles.muted}>{copy.noRelations}</p>
      ) : null}
      <ul className={styles.recipes}>
        {rows.map((r) => (
          <li key={`${r.relation}-${r.other_country_code}-${String(r.ours)}-${r.detail ?? ''}`}>
            {line(r)}
          </li>
        ))}
      </ul>
    </Panel>
  );
}
