import { useEffect, useState } from 'react';
import { fetchOsmDetails, type OsmDetails } from './osm';

/** Сайт и часы работы места из OpenStreetMap — по требованию, при открытии карточки. */
export function useOsmDetails(providerPlaceId: string | null): OsmDetails | null {
  const [state, setState] = useState<{ id: string; details: OsmDetails | null } | null>(null);
  useEffect(() => {
    if (!providerPlaceId) return;
    let alive = true;
    void fetchOsmDetails(providerPlaceId).then((details) => {
      if (alive) setState({ id: providerPlaceId, details });
    });
    return () => {
      alive = false;
    };
  }, [providerPlaceId]);
  return state && state.id === providerPlaceId ? state.details : null;
}
