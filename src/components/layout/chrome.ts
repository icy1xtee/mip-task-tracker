import { createContext, useContext, useEffect, useRef } from 'react';

/** Заголовок и действие «+» верхней панели на телефоне — их задаёт текущая страница. */
export type PageChrome = { title: string; sub: string; addLabel: string | null };

type ChromeContextValue = {
  setChrome: (chrome: PageChrome) => void;
  addRef: { current: (() => void) | null };
};

export const ChromeContext = createContext<ChromeContextValue | null>(null);

export function usePageChrome(chrome: PageChrome, onAdd: (() => void) | null) {
  const ctx = useContext(ChromeContext);
  if (!ctx) throw new Error('usePageChrome используется вне AppShell');
  const { setChrome, addRef } = ctx;
  const latest = useRef(onAdd);

  useEffect(() => {
    latest.current = onAdd;
  });

  useEffect(() => {
    addRef.current = () => latest.current?.();
    setChrome(chrome);
    return () => {
      addRef.current = null;
    };
  }, [chrome.title, chrome.sub, chrome.addLabel]); // eslint-disable-line react-hooks/exhaustive-deps
}
