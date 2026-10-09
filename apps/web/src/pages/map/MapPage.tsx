import { Button } from '@concordia/atlas/Button';
import { Note } from '@concordia/atlas/Note';
import { useCallback, useMemo, useState } from 'react';

import { borderPaths, buildShapes } from '../../features/map/geometry';
import { MapSearch } from '../../features/map/MapSearch';
import type { SearchOption } from '../../features/map/MapSearch';
import { SelectionPanel } from '../../features/map/SelectionPanel';
import type { Selection } from '../../features/map/SelectionPanel';
import { useTopology } from '../../features/map/useTopology';
import { WorldMap } from '../../features/map/WorldMap';
import { useWorld } from '../../features/world/useWorld';
import type { Country } from '../../features/world/useWorld';
import { useLocale, useMessages } from '../../i18n';
import { useDocumentTitle } from '../../lib/useDocumentTitle';

import styles from './MapPage.module.css';
import { messages } from './messages';

export function MapPage() {
  const copy = useMessages(messages);
  const { locale } = useLocale();
  useDocumentTitle(copy.documentTitle);
  const topology = useTopology();
  const world = useWorld();
  const [selection, setSelection] = useState<Selection>(null);
  const [focusId, setFocusId] = useState<string | null>(null);
  const [announcement, setAnnouncement] = useState('');

  const shapes = useMemo(() => (topology.data ? buildShapes(topology.data) : []), [topology.data]);
  const provinces = useMemo(
    () => new Map(shapes.map((shape) => [shape.id, shape.provinces])),
    [shapes],
  );

  const worldData = world.data;
  const countryName = useCallback(
    (code: string) => {
      const country = worldData?.countries.get(code);
      if (!country) return code;
      return locale === 'es' ? country.name_es : country.name_en;
    },
    [worldData, locale],
  );

  // A shape is playable when it is an enabled region; its owner decides the color.
  const ownerOf = useCallback(
    (shapeId: string) => {
      const region = worldData?.regions.get(shapeId);
      return region?.is_enabled ? region.owner_country_code : undefined;
    },
    [worldData],
  );
  const borders = useMemo(
    () =>
      topology.data
        ? borderPaths(topology.data, ownerOf)
        : { countryBorders: '', regionBorders: '' },
    [topology.data, ownerOf],
  );

  const select = (next: NonNullable<Selection>, name: string, focus: string | null) => {
    setSelection(next);
    setFocusId(focus);
    setAnnouncement(copy.selected(name));
  };

  const searchOptions: SearchOption[] = useMemo(() => {
    if (!worldData) return [];
    const activeCountries = [...worldData.countries.values()].filter(
      (country: Country) => country.is_active,
    );
    return [
      ...activeCountries.map((country) => ({
        id: country.code,
        name: countryName(country.code),
        kind: copy.countryOption,
      })),
      ...[...worldData.regions.values()].map((region) => ({
        id: region.code,
        name: region.name,
        kind: copy.regionOption(countryName(region.home_country_code)),
      })),
    ];
  }, [worldData, countryName, copy]);

  const failed = topology.isError || world.isError;
  const ready = topology.data !== undefined && world.data !== undefined;

  return (
    <main className={styles.page}>
      <div className={styles.header}>
        <h1 className="at-title-1">{copy.title}</h1>
        {ready ? (
          <MapSearch
            options={searchOptions}
            label={copy.searchLabel}
            placeholder={copy.searchPlaceholder}
            noResults={copy.noResults}
            resultCount={copy.resultCount}
            onChoose={(option) => {
              const isRegion = option.id.includes('-');
              select(
                isRegion
                  ? { type: 'region', code: option.id }
                  : { type: 'country', code: option.id },
                option.name,
                isRegion
                  ? option.id
                  : (shapes.find((shape) => ownerOf(shape.id) === option.id)?.id ?? null),
              );
            }}
          />
        ) : null}
      </div>

      <p className="at-visually-hidden" role="status" aria-live="polite">
        {announcement}
      </p>

      {failed ? (
        <div className={styles.state}>
          <Note tone="error">{copy.loadError}</Note>
          <Button
            variant="secondary"
            onClick={() => {
              if (topology.isError) void topology.refetch();
              if (world.isError) void world.refetch();
            }}
          >
            {copy.retry}
          </Button>
        </div>
      ) : !ready ? (
        <p className={styles.state} role="status">
          {copy.loading}
        </p>
      ) : (
        <div className={styles.layout}>
          <div className={styles.map}>
            <WorldMap
              shapes={shapes}
              borders={borders}
              fillOf={(shapeId) => {
                const owner = ownerOf(shapeId);
                return owner ? (world.data.countries.get(owner)?.color ?? undefined) : undefined;
              }}
              selectedId={selection?.type === 'region' ? selection.code : null}
              onSelect={(shapeId) => {
                const region = world.data.regions.get(shapeId);
                if (region) select({ type: 'region', code: shapeId }, region.name, null);
              }}
              focusId={focusId}
              label={copy.mapLabel}
              labels={{ zoomIn: copy.zoomIn, zoomOut: copy.zoomOut, zoomReset: copy.zoomReset }}
            />
          </div>
          <SelectionPanel
            selection={selection}
            regions={world.data.regions}
            countries={world.data.countries}
            provincesOf={(code) => provinces.get(code) ?? []}
            countryName={countryName}
            copy={copy}
            viewCountryLabel={copy.viewCountry}
            onSelect={(next) => {
              const name =
                next.type === 'region'
                  ? (world.data.regions.get(next.code)?.name ?? next.code)
                  : countryName(next.code);
              const focus =
                next.type === 'region'
                  ? next.code
                  : (shapes.find((shape) => ownerOf(shape.id) === next.code)?.id ?? null);
              select(next, name, focus);
            }}
          />
        </div>
      )}
    </main>
  );
}
