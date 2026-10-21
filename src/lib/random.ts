/**
 * Честный случайный выбор: равномерный индекс через crypto.getRandomValues
 * с отбрасыванием «хвоста», чтобы не было смещения по модулю.
 */
type RandomSource = (buf: Uint32Array<ArrayBuffer>) => Uint32Array<ArrayBuffer>;

const cryptoSource: RandomSource = (buf) => crypto.getRandomValues(buf);

export function randomIndex(length: number, random: RandomSource = cryptoSource): number {
  if (!Number.isInteger(length) || length <= 0)
    throw new Error('length must be a positive integer');
  const limit = Math.floor(0x1_0000_0000 / length) * length;
  const buf = new Uint32Array(1);
  for (;;) {
    const value = random(buf)[0] ?? 0;
    if (value < limit) return value % length;
  }
}

export function pickRandom<T>(items: readonly T[], random?: RandomSource): T | null {
  if (items.length === 0) return null;
  return items[randomIndex(items.length, random)] ?? null;
}
