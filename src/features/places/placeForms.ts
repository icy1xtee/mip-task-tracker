import { z } from 'zod';
import { todayIsoDate, type IsoDate } from '@/lib/format/dates';
import { minorToRublesInput } from '@/lib/format/money';
import { optionalMoney, optionalText, requiredDate } from '@/lib/forms';
import type { PlaceVisit } from '@/types/models';
import type { PlaceInput, VisitInput } from './api';
import { SCORE_MAX, SCORE_MIN } from './placeMeta';

/** Поля посещения — общие для формы места («Были») и формы посещения. */

const score = z.number().int().min(SCORE_MIN).max(SCORE_MAX).nullable();

export const visitFields = {
  date: requiredDate.refine((v) => v <= todayIsoDate(), 'Дата посещения — не позже сегодня'),
  spent: optionalMoney,
  pavelRating: score,
  milaRating: score,
  pavelReturnScore: score,
  milaReturnScore: score,
  visitNote: optionalText(2000),
};

export const visitSchema = z.object(visitFields);

export type VisitValues = z.input<typeof visitSchema>;
type VisitOutput = z.output<typeof visitSchema>;

export function visitDefaults(visit: PlaceVisit | null, today: IsoDate): VisitValues {
  return {
    date: visit?.date ?? today,
    spent: visit?.spentMinor != null ? minorToRublesInput(visit.spentMinor) : '',
    pavelRating: visit?.pavelRating ?? null,
    milaRating: visit?.milaRating ?? null,
    pavelReturnScore: visit?.pavelReturnScore ?? null,
    milaReturnScore: visit?.milaReturnScore ?? null,
    visitNote: visit?.note ?? '',
  };
}

export function toVisitInput(v: VisitOutput): VisitInput {
  return {
    date: v.date,
    spentMinor: v.spent,
    pavelRating: v.pavelRating,
    milaRating: v.milaRating,
    pavelReturnScore: v.pavelReturnScore,
    milaReturnScore: v.milaReturnScore,
    note: v.visitNote,
  };
}

/** Новое место до сохранения: результат поиска или ручная точка. */
export type PlaceDraft = Omit<PlaceInput, 'status' | 'note'>;

/** «59.93912, 30.31585». */
export function formatCoords(p: { latitude: number; longitude: number }): string {
  return `${p.latitude.toFixed(5)}, ${p.longitude.toFixed(5)}`;
}
