/**
 * Нормализует пользовательский URL: добавляет https://, если схемы нет,
 * и пропускает только http/https. Для javascript:, data: и т.п. возвращает null.
 */
export function normalizeUrl(input: string): string | null {
  const trimmed = input.trim();
  if (!trimmed) return null;
  const hasScheme = /^[a-z][a-z\d+.-]*:/i.test(trimmed);
  const candidate = hasScheme ? trimmed : `https://${trimmed}`;
  try {
    const url = new URL(candidate);
    if (url.protocol !== 'http:' && url.protocol !== 'https:') return null;
    if (!url.hostname.includes('.') && url.hostname !== 'localhost') return null;
    return url.toString();
  } catch {
    return null;
  }
}

export function isSafeUrl(value: string): boolean {
  return normalizeUrl(value) === value;
}

/** «https://www.notion.so/abc» → «notion.so». */
export function domainOf(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return url;
  }
}
