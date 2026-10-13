import { Button } from '@concordia/atlas/Button';
import { Note } from '@concordia/atlas/Note';

import { MapSearch } from '../../features/map/MapSearch';
import { SelectionPanel } from '../../features/map/SelectionPanel';
import { WorldMap } from '../../features/map/WorldMap';
import { useMessages } from '../../i18n';
import { useDocumentTitle } from '../../lib/useDocumentTitle';

import styles from './MapPage.module.css';
import { messages } from './messages';
import { useMapModel } from './useMapModel';
import { useMapSelection } from './useMapSelection';

/** `/map` (Map canvas): who owns each region, with search and the selected region or country. */
export function MapPage() {
  const copy = useMessages(messages);
  useDocumentTitle(copy.documentTitle);
  const model = useMapModel();
  const map = useMapSelection(model);
  const world = model.ready ? model.world : undefined;

  return (
    <main className={styles.page}>
      <div className={styles.header}>
        <h1 className="at-title-1">{copy.title}</h1>
        {world ? (
          <MapSearch
            options={model.searchOptions}
            label={copy.searchLabel}
            placeholder={copy.searchPlaceholder}
            noResults={copy.noResults}
            resultCount={copy.resultCount}
            onChoose={(option) => {
              map.choose(
                option.id.includes('-')
                  ? { type: 'region', code: option.id }
                  : { type: 'country', code: option.id },
              );
            }}
          />
        ) : null}
      </div>

      <p className="at-visually-hidden" role="status" aria-live="polite">
        {map.announcement}
      </p>

      {model.failed ? (
        <div className={styles.state}>
          <Note tone="error">{copy.loadError}</Note>
          <Button variant="secondary" onClick={model.retry}>
            {copy.retry}
          </Button>
        </div>
      ) : !world ? (
        <p className={styles.state} role="status">
          {copy.loading}
        </p>
      ) : (
        <div className={styles.layout}>
          <div className={styles.map}>
            <WorldMap
              shapes={model.shapes}
              borders={model.borders}
              fillOf={(shapeId) => {
                const owner = model.ownerOf(shapeId);
                return owner ? (world.countries.get(owner)?.color ?? undefined) : undefined;
              }}
              selectedId={map.selection?.type === 'region' ? map.selection.code : null}
              onSelect={map.clickRegion}
              focusId={map.focusId}
              label={copy.mapLabel}
              labels={{ zoomIn: copy.zoomIn, zoomOut: copy.zoomOut, zoomReset: copy.zoomReset }}
            />
          </div>
          <SelectionPanel
            selection={map.selection}
            regions={world.regions}
            countries={world.countries}
            provincesOf={model.provincesOf}
            countryName={model.countryName}
            copy={copy}
            viewCountryLabel={copy.viewCountry}
            onSelect={map.choose}
          />
        </div>
      )}
    </main>
  );
}
