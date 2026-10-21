import type { PlaceCategory, PlaceStatus, PlaceVisit } from '@/types/models';

/**
 * Справочники раздела «Места». Логика экрана не завязана на конкретные категории:
 * новая категория — строка здесь, в PlaceCategory и в enum firestore.rules.
 */
export const PLACE_CATEGORY_VALUES = [
  'restaurant',
  'cafe',
  'bar',
  'cinema',
  'museum',
  'park',
  'shop',
  'entertainment',
  'other',
] as const satisfies readonly PlaceCategory[];

const CATEGORY_LABELS: Record<PlaceCategory, string> = {
  restaurant: 'Ресторан',
  cafe: 'Кафе',
  bar: 'Бар',
  cinema: 'Кино',
  museum: 'Музей',
  park: 'Парк',
  shop: 'Магазин',
  entertainment: 'Развлечения',
  other: 'Другое',
};

export const PLACE_CATEGORIES = PLACE_CATEGORY_VALUES.map((value) => ({
  value,
  label: CATEGORY_LABELS[value],
}));

export function categoryLabel(category: PlaceCategory): string {
  return CATEGORY_LABELS[category] ?? CATEGORY_LABELS.other;
}

export const PLACE_STATUSES = [
  'want-to-visit',
  'visited',
] as const satisfies readonly PlaceStatus[];

export const STATUS_LABEL: Record<PlaceStatus, string> = {
  'want-to-visit': 'Хотим посетить',
  visited: 'Были',
};

export type PartnerKey = 'pavel' | 'mila';

type ScoreField = keyof Pick<
  PlaceVisit,
  'pavelRating' | 'milaRating' | 'pavelReturnScore' | 'milaReturnScore'
>;

/** Партнёры и их поля оценок в посещении. Аккаунт общий, поэтому оценки подписаны именами. */
export const PARTNERS: {
  key: PartnerKey;
  name: string;
  rating: ScoreField;
  returnScore: ScoreField;
}[] = [
  { key: 'pavel', name: 'Павел', rating: 'pavelRating', returnScore: 'pavelReturnScore' },
  { key: 'mila', name: 'Мила', rating: 'milaRating', returnScore: 'milaReturnScore' },
];

export const SCORE_MIN = 1;
export const SCORE_MAX = 10;
