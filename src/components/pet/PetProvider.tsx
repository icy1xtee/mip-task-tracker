import { useEffect, useMemo, useRef, type ReactNode } from 'react';
import { DOG_SKIN } from './dogSkin';
import { createPet, type PetController } from './petEngine';
import { PetContext } from './usePet';

/** Пол — верх нижней навигации на телефоне, иначе низ оболочки. */
function floorOf(shell: HTMLElement): number {
  const tabbar = shell.querySelector<HTMLElement>('.tabbar');
  const shellTop = shell.getBoundingClientRect().top;
  if (tabbar && tabbar.offsetParent !== null) return tabbar.getBoundingClientRect().top - shellTop;
  return shell.clientHeight - 6;
}

/** Левая стена — правый край сайдбара (на телефоне его нет). */
function leftOf(shell: HTMLElement): number {
  const side = shell.querySelector<HTMLElement>('.side');
  if (!side || side.offsetParent === null) return 0;
  return side.getBoundingClientRect().right - shell.getBoundingClientRect().left;
}

/** Собачка, которая гуляет по низу экрана внутри `.shell`. */
export function PetProvider({
  shell,
  children,
}: {
  shell: HTMLElement | null;
  children: ReactNode;
}) {
  const pet = useRef<PetController | null>(null);

  useEffect(() => {
    if (!shell) return;
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const controller = createPet(shell, DOG_SKIN, {
      floor: () => floorOf(shell),
      left: () => leftOf(shell),
      reduceMotion,
    });
    pet.current = controller;
    return () => {
      controller.destroy();
      pet.current = null;
    };
  }, [shell]);

  const api = useMemo(() => ({ cheer: (text?: string) => pet.current?.cheer(text) }), []);

  return <PetContext value={api}>{children}</PetContext>;
}
