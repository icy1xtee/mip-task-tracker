/** Копирует текст в буфер обмена. Запасной путь — для старого Safari и контекстов без Clipboard API. */
export async function copyText(text: string): Promise<void> {
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(text);
    return;
  }
  const area = document.createElement('textarea');
  area.value = text;
  area.setAttribute('readonly', '');
  area.style.position = 'fixed';
  area.style.opacity = '0';
  document.body.appendChild(area);
  area.select();
  const ok = document.execCommand('copy');
  area.remove();
  if (!ok) throw new Error('copy failed');
}

/** Собирает текст из строк, пропуская пустые: [заголовок, 'Срок: …' | null, …]. */
export function joinLines(lines: (string | null | undefined | false)[]): string {
  return lines.filter((l): l is string => typeof l === 'string' && l.trim() !== '').join('\n');
}
