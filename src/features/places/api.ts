import { deleteDoc, setDoc, updateDoc, writeBatch } from 'firebase/firestore';
import { created, db, docRef, newDocRef, touched, useCollection, write } from '@/lib/firebase/db';
import {
  audit,
  intOrNull,
  isoDate,
  num,
  oneOf,
  safeParser,
  str,
  strOrNull,
} from '@/lib/firebase/parse';
import type { IsoDate } from '@/lib/format/dates';
import type { Place, PlaceCategory, PlaceProvider, PlaceStatus, PlaceVisit } from '@/types/models';
import { PLACE_CATEGORY_VALUES, PLACE_STATUSES } from './placeMeta';

const PROVIDERS = ['osm', 'manual'] as const satisfies readonly PlaceProvider[];

const parsePlace = safeParser('places', (id, d): Place => ({
  ...audit(id, d),
  provider: oneOf(d, 'provider', PROVIDERS),
  providerPlaceId: strOrNull(d, 'providerPlaceId'),
  name: str(d, 'name'),
  address: strOrNull(d, 'address'),
  city: strOrNull(d, 'city'),
  latitude: num(d, 'latitude'),
  longitude: num(d, 'longitude'),
  category: oneOf(d, 'category', PLACE_CATEGORY_VALUES),
  status: oneOf(d, 'status', PLACE_STATUSES),
  note: strOrNull(d, 'note'),
}));

const parseVisit = safeParser('placeVisits', (id, d): PlaceVisit => ({
  ...audit(id, d),
  placeId: str(d, 'placeId'),
  date: isoDate(d, 'date'),
  spentMinor: intOrNull(d, 'spentMinor'),
  pavelRating: intOrNull(d, 'pavelRating'),
  milaRating: intOrNull(d, 'milaRating'),
  pavelReturnScore: intOrNull(d, 'pavelReturnScore'),
  milaReturnScore: intOrNull(d, 'milaReturnScore'),
  note: strOrNull(d, 'note'),
}));

export function usePlaces() {
  return useCollection('places', parsePlace);
}

export function usePlaceVisits() {
  return useCollection('placeVisits', parseVisit);
}

export type PlaceInput = {
  provider: PlaceProvider;
  providerPlaceId: string | null;
  name: string;
  address: string | null;
  city: string | null;
  latitude: number;
  longitude: number;
  category: PlaceCategory;
  status: PlaceStatus;
  note: string | null;
};

export type VisitInput = {
  date: IsoDate;
  spentMinor: number | null;
  pavelRating: number | null;
  milaRating: number | null;
  pavelReturnScore: number | null;
  milaReturnScore: number | null;
  note: string | null;
};

/** Место и (для «Были») первое посещение — одной записью: не бывает места без визита и наоборот. */
export function createPlace(input: PlaceInput, firstVisit: VisitInput | null) {
  const placeRef = newDocRef('places');
  return write(async () => {
    const batch = writeBatch(db());
    batch.set(placeRef, { ...input, ...created() });
    if (firstVisit)
      batch.set(newDocRef('placeVisits'), { ...firstVisit, placeId: placeRef.id, ...created() });
    await batch.commit();
    return placeRef.id;
  });
}

export function updatePlace(id: string, input: Omit<PlaceInput, 'provider' | 'providerPlaceId'>) {
  return write(() => updateDoc(docRef('places', id), { ...input, ...touched() }));
}

/** Удаляет место вместе со всеми его посещениями. */
export function deletePlace(id: string, visitIds: string[]) {
  return write(() => {
    const batch = writeBatch(db());
    for (const visitId of visitIds) batch.delete(docRef('placeVisits', visitId));
    batch.delete(docRef('places', id));
    return batch.commit();
  });
}

/** Новое посещение; «Хотим посетить» после первого визита становится «Были». */
export function createVisit(place: Pick<Place, 'id' | 'status'>, input: VisitInput) {
  return write(() => {
    if (place.status === 'visited')
      return setDoc(newDocRef('placeVisits'), { ...input, placeId: place.id, ...created() });
    const batch = writeBatch(db());
    batch.set(newDocRef('placeVisits'), { ...input, placeId: place.id, ...created() });
    batch.update(docRef('places', place.id), { status: 'visited', ...touched() });
    return batch.commit();
  });
}

export function updateVisit(id: string, input: VisitInput) {
  return write(() => updateDoc(docRef('placeVisits', id), { ...input, ...touched() }));
}

export function deleteVisit(id: string) {
  return write(() => deleteDoc(docRef('placeVisits', id)));
}
