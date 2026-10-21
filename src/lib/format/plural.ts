/** Русское склонение по числу: pl(3, 'дело', 'дела', 'дел') → 'дела'. */
export function pl(n: number, one: string, few: string, many: string): string {
  const x = Math.abs(n) % 100;
  const y = x % 10;
  if (x > 10 && x < 20) return many;
  if (y > 1 && y < 5) return few;
  if (y === 1) return one;
  return many;
}

/** «3 дела». */
export function pln(n: number, one: string, few: string, many: string): string {
  return `${n}\u00a0${pl(n, one, few, many)}`;
}
