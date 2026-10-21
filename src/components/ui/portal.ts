import { createContext, useContext } from 'react';

/**
 * Оверлеи (меню, панели, диалоги) монтируются внутрь оболочки .shell, а не в body:
 * так на них действуют container queries дизайн-системы (bottom sheet на телефоне).
 */
export const PortalContainerContext = createContext<HTMLElement | null>(null);

export function usePortalContainer(): HTMLElement | undefined {
  return useContext(PortalContainerContext) ?? undefined;
}
