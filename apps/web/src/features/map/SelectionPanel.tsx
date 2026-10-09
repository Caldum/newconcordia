import { Button } from '@concordia/atlas/Button';
import { Note } from '@concordia/atlas/Note';
import { Panel } from '@concordia/atlas/Panel';

import type { Country, Region } from '../world/useWorld';

import styles from './SelectionPanel.module.css';

export type Selection = { type: 'region'; code: string } | { type: 'country'; code: string } | null;

export interface PanelCopy {
  nothingSelected: string;
  chooseHint: string;
  regionOf: (country: string) => string;
  controlledBy: string;
  homeCountry: string;
  provinces: string;
  occupied: (owner: string, home: string) => string;
  underControl: (home: string) => string;
  disabled: string;
  country: string;
  controls: string;
  regionsCount: (count: number) => string;
  ownRegions: (kept: number, total: number) => string;
  regionsTitle: string;
  notInPlay: string;
}

interface SelectionPanelProps {
  selection: Selection;
  regions: ReadonlyMap<string, Region>;
  countries: ReadonlyMap<string, Country>;
  provincesOf: (regionCode: string) => readonly string[];
  countryName: (code: string) => string;
  onSelect: (selection: NonNullable<Selection>) => void;
  copy: PanelCopy;
  /** Label of the button that shows the owner country: «Ver España». */
  viewCountryLabel: (name: string) => string;
}

function Chip({ color }: { color: string | null | undefined }) {
  return (
    <span
      className={styles.chip}
      style={{ background: color ?? 'var(--country-inactive)' }}
      aria-hidden="true"
    />
  );
}

/** Facts about the chosen region or country. */
export function SelectionPanel({
  selection,
  regions,
  countries,
  provincesOf,
  countryName,
  onSelect,
  copy,
  viewCountryLabel,
}: SelectionPanelProps) {
  if (!selection) {
    return (
      <Panel className={styles.panel} aria-labelledby="selection-title">
        <p className={styles.eyebrow}>{copy.nothingSelected}</p>
        <h2 id="selection-title" className="at-title-2">
          {copy.country}
        </h2>
        <p className="at-support">{copy.chooseHint}</p>
      </Panel>
    );
  }

  if (selection.type === 'region') {
    const region = regions.get(selection.code);
    if (!region) return null;
    const owner = countryName(region.owner_country_code);
    const home = countryName(region.home_country_code);
    const provinces = provincesOf(region.code);
    return (
      <Panel className={styles.panel} aria-labelledby="selection-title">
        <div>
          <p className={styles.eyebrow}>{copy.regionOf(home)}</p>
          <h2
            id="selection-title"
            className={`${styles.name} at-place-xl`}
            style={{ fontSize: 40, lineHeight: 1.05 }}
          >
            {region.name}
          </h2>
        </div>
        <dl className={styles.facts}>
          <dt>{copy.controlledBy}</dt>
          <dd>
            <Chip color={countries.get(region.owner_country_code)?.color} />
            {owner}
          </dd>
          <dt>{copy.homeCountry}</dt>
          <dd>
            <Chip color={countries.get(region.home_country_code)?.color} />
            {home}
          </dd>
          {provinces.length > 0 ? (
            <>
              <dt>{copy.provinces}</dt>
              <dd style={{ fontWeight: 400 }}>{provinces.join(', ')}</dd>
            </>
          ) : null}
        </dl>
        {region.is_enabled ? (
          <p className={styles.status}>
            {region.owner_country_code === region.home_country_code
              ? copy.underControl(home)
              : copy.occupied(owner, home)}
          </p>
        ) : (
          <Note tone="info">{copy.disabled}</Note>
        )}
        <div>
          <Button
            variant="secondary"
            onClick={() => {
              onSelect({ type: 'country', code: region.owner_country_code });
            }}
          >
            {viewCountryLabel(owner)}
          </Button>
        </div>
      </Panel>
    );
  }

  const country = countries.get(selection.code);
  if (!country) return null;
  const name = countryName(country.code);
  // Disputed territories that are not enabled do not count until the admin panel enables them.
  const inPlay = [...regions.values()].filter((region) => region.is_enabled);
  const owned = inPlay.filter((region) => region.owner_country_code === country.code);
  const home = inPlay.filter((region) => region.home_country_code === country.code);
  const kept = home.filter((region) => region.owner_country_code === country.code).length;
  return (
    <Panel className={styles.panel} aria-labelledby="selection-title">
      <div>
        <p className={styles.eyebrow}>{copy.country}</p>
        <h2
          id="selection-title"
          className={`${styles.name} at-place-xl`}
          style={{ fontSize: 40, lineHeight: 1.05 }}
        >
          {name}
        </h2>
      </div>
      {country.is_active ? (
        <>
          <dl className={styles.facts}>
            <dt>{copy.controls}</dt>
            <dd>{copy.regionsCount(owned.length)}</dd>
            <dt>{copy.homeCountry}</dt>
            <dd>{copy.ownRegions(kept, home.length)}</dd>
          </dl>
          <div>
            <h3 className="at-title-3">{copy.regionsTitle}</h3>
            <ul className={styles.list}>
              {owned.map((region) => (
                <li key={region.code}>
                  <button
                    type="button"
                    onClick={() => {
                      onSelect({ type: 'region', code: region.code });
                    }}
                  >
                    <Chip color={countries.get(region.home_country_code)?.color} />
                    <span className="at-place-s">{region.name}</span>
                  </button>
                </li>
              ))}
            </ul>
          </div>
        </>
      ) : (
        <Note tone="info">{copy.notInPlay}</Note>
      )}
    </Panel>
  );
}
