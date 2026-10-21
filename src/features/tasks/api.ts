import { deleteDoc, setDoc, updateDoc } from 'firebase/firestore';
import { created, docRef, newDocRef, touched, useCollection, write } from '@/lib/firebase/db';
import {
  audit,
  bool,
  intOrNull,
  isoDateOrNull,
  oneOfOrNull,
  safeParser,
  str,
  strOrNull,
} from '@/lib/firebase/parse';
import type { IsoDate } from '@/lib/format/dates';
import type { Task } from '@/types/models';

const parseTask = safeParser('tasks', (id, d): Task => ({
  ...audit(id, d),
  title: str(d, 'title'),
  description: strOrNull(d, 'description'),
  dueDate: isoDateOrNull(d, 'dueDate'),
  estimatedCostMinor: intOrNull(d, 'estimatedCostMinor'),
  assignee: oneOfOrNull(d, 'assignee', ['me', 'partner', 'both'] as const),
  isCompleted: bool(d, 'isCompleted'),
}));

export function useTasks() {
  return useCollection('tasks', parseTask);
}

export type TaskInput = {
  title: string;
  description: string | null;
  dueDate: IsoDate | null;
  estimatedCostMinor: number | null;
};

export function createTask(input: TaskInput) {
  return write(() =>
    setDoc(newDocRef('tasks'), { ...input, assignee: null, isCompleted: false, ...created() }),
  );
}

export function updateTask(id: string, input: TaskInput) {
  return write(() => updateDoc(docRef('tasks', id), { ...input, ...touched() }));
}

export function setTaskCompleted(id: string, isCompleted: boolean) {
  return write(() => updateDoc(docRef('tasks', id), { isCompleted, ...touched() }));
}

export function deleteTask(id: string) {
  return write(() => deleteDoc(docRef('tasks', id)));
}
