import { deleteDoc, setDoc, updateDoc } from 'firebase/firestore';
import { created, docRef, newDocRef, touched, useCollection, write } from '@/lib/firebase/db';
import {
  audit,
  bool,
  intOrNull,
  isoDateOrNull,
  oneOf,
  safeParser,
  str,
  strOrNull,
} from '@/lib/firebase/parse';
import type { IsoDate } from '@/lib/format/dates';
import type { Activity, ActivityStatus } from '@/types/models';

export const ACTIVITY_STATUSES = ['wishlist', 'booked', 'completed', 'archived'] as const;

const parseActivity = safeParser('activities', (id, d): Activity => ({
  ...audit(id, d),
  title: str(d, 'title'),
  description: strOrNull(d, 'description'),
  url: strOrNull(d, 'url'),
  estimatedCostMinor: intOrNull(d, 'estimatedCostMinor'),
  status: oneOf(d, 'status', ACTIVITY_STATUSES),
  needsBooking: bool(d, 'needsBooking'),
  plannedDate: isoDateOrNull(d, 'plannedDate'),
}));

export function useActivities() {
  return useCollection('activities', parseActivity);
}

export type ActivityInput = {
  title: string;
  description: string | null;
  url: string | null;
  estimatedCostMinor: number | null;
  status: ActivityStatus;
  needsBooking: boolean;
  plannedDate: IsoDate | null;
};

export function createActivity(input: ActivityInput) {
  return write(() => setDoc(newDocRef('activities'), { ...input, ...created() }));
}

export function updateActivity(id: string, input: ActivityInput) {
  return write(() => updateDoc(docRef('activities', id), { ...input, ...touched() }));
}

export function setActivityStatus(id: string, status: ActivityStatus) {
  return write(() => updateDoc(docRef('activities', id), { status, ...touched() }));
}

export function deleteActivity(id: string) {
  return write(() => deleteDoc(docRef('activities', id)));
}
