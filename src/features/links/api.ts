import { deleteDoc, setDoc, updateDoc } from 'firebase/firestore';
import { created, docRef, newDocRef, touched, useCollection, write } from '@/lib/firebase/db';
import {
  InvalidDocument,
  audit,
  oneOf,
  safeParser,
  str,
  strOrNull,
  strings,
} from '@/lib/firebase/parse';
import { isSafeUrl } from '@/lib/format/url';
import type { LinkItem, LinkType } from '@/types/models';

export const LINK_TYPE_VALUES = [
  'workspace',
  'document',
  'spreadsheet',
  'folder',
  'other',
] as const;

const parseLink = safeParser('links', (id, d): LinkItem => {
  const url = str(d, 'url');
  // Даже если в базу попал небезопасный адрес, он не превратится в кликабельную ссылку.
  if (!isSafeUrl(url)) throw new InvalidDocument('url');
  return {
    ...audit(id, d),
    title: str(d, 'title'),
    url,
    description: strOrNull(d, 'description'),
    type: oneOf(d, 'type', LINK_TYPE_VALUES),
    tags: strings(d, 'tags'),
  };
});

export function useLinks() {
  return useCollection('links', parseLink);
}

export type LinkInput = { title: string; url: string; description: string | null; type: LinkType };

export function createLink(input: LinkInput) {
  return write(() => setDoc(newDocRef('links'), { ...input, tags: [], ...created() }));
}

export function updateLink(id: string, input: LinkInput) {
  return write(() => updateDoc(docRef('links', id), { ...input, ...touched() }));
}

export function deleteLink(id: string) {
  return write(() => deleteDoc(docRef('links', id)));
}
