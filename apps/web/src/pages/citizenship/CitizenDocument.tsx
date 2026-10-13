import { Document } from '@concordia/atlas/Document';
import { Flag, hasFlag } from '@concordia/atlas/Flag';

import { useCurrentCitizen } from '../../features/shell/CurrentCitizen';
import { officialCountryName } from '../../features/world/names';
import { useCountryName, useRegionName } from '../../features/world/useNames';
import { useWorld } from '../../features/world/useWorld';
import { formatDate, useLocale, useMessages } from '../../i18n';

import { messages } from './messages';

/** The citizenship document: name, number, residence and since when. */
export function CitizenDocument({ animate }: { animate: boolean }) {
  const copy = useMessages(messages);
  const { locale } = useLocale();
  const citizen = useCurrentCitizen();
  const world = useWorld();
  const countryName = useCountryName();
  const regionName = useRegionName();
  const country = world.data?.countries.get(citizen.country_code);
  return (
    <Document
      heading={copy.documentHeading}
      country={country ? officialCountryName(country, locale) : citizen.country_code}
      animate={animate}
      silhouette={
        hasFlag(citizen.country_code) ? (
          <span role="img" aria-label={copy.flagOf(countryName(citizen.country_code))}>
            <Flag code={citizen.country_code} width={96} />
          </span>
        ) : null
      }
      fields={[
        { label: copy.name, value: citizen.name, kind: 'name' },
        { label: copy.number, value: citizen.citizen_code, kind: 'number' },
        { label: copy.region, value: regionName(citizen.region_code), kind: 'place' },
        { label: copy.since, value: formatDate(citizen.citizen_since, locale) },
      ]}
    />
  );
}
