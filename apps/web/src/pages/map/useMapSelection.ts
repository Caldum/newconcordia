import { useState } from 'react';

import type { Selection } from '../../features/map/SelectionPanel';
import { useMessages } from '../../i18n';

import { messages } from './messages';
import type { MapModel } from './useMapModel';

/** What is selected on the map, the shape to bring into view, and the announcement for screen readers. */
export function useMapSelection(model: MapModel) {
  const copy = useMessages(messages);
  const [selection, setSelection] = useState<Selection>(null);
  const [focusId, setFocusId] = useState<string | null>(null);
  const [announcement, setAnnouncement] = useState('');

  const choose = (next: NonNullable<Selection>) => {
    const isRegion = next.type === 'region';
    const name = isRegion
      ? (model.world?.regions.get(next.code)?.name ?? next.code)
      : model.countryName(next.code);
    setSelection(next);
    setFocusId(isRegion ? next.code : model.firstShapeOf(next.code));
    setAnnouncement(copy.selected(name));
  };

  return {
    selection,
    focusId,
    announcement,
    choose,
    /** A click on the map: the region stays where it is, nothing to bring into view. */
    clickRegion: (code: string) => {
      const region = model.world?.regions.get(code);
      if (!region) return;
      setSelection({ type: 'region', code });
      setFocusId(null);
      setAnnouncement(copy.selected(region.name));
    },
  };
}
