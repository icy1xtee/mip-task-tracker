import { useRef, type PointerEvent } from 'react';

/** Сколько надо протянуть вниз, чтобы закрыть: четверть высоты листа, но не больше 120px. */
const CLOSE_DISTANCE_MAX = 120;
/** Быстрый смах закрывает и с меньшего расстояния (px/мс). */
const CLOSE_VELOCITY = 0.5;
const ANIMATION_MS = 200;

type DragState = {
  pointerId: number;
  startY: number;
  lastY: number;
  lastTime: number;
  velocity: number;
  dy: number;
};

/**
 * Закрытие bottom sheet свайпом вниз (телефон). Тянуть можно за ручку и заголовок —
 * не за содержимое, чтобы не спорить с прокруткой формы и полями ввода.
 * На desktop/планшете панель боковая (ручка скрыта CSS) — жест выключен.
 */
export function useSheetDrag({ enabled, onClose }: { enabled: boolean; onClose: () => void }) {
  const contentRef = useRef<HTMLDivElement>(null);
  const overlayRef = useRef<HTMLDivElement>(null);
  const drag = useRef<DragState | null>(null);

  const isSheet = () => {
    const grabber = contentRef.current?.querySelector('.grabber');
    return grabber instanceof HTMLElement && getComputedStyle(grabber).display !== 'none';
  };

  const reducedMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const apply = (dy: number, animate: boolean) => {
    const content = contentRef.current;
    if (!content) return;
    const transition = animate && !reducedMotion() ? `${ANIMATION_MS}ms ease-out` : 'none';
    content.style.transition = `transform ${transition}`;
    content.style.transform = dy ? `translateY(${dy}px)` : '';
    const overlay = overlayRef.current;
    if (overlay) {
      overlay.style.transition = `opacity ${transition}`;
      overlay.style.opacity = dy ? String(Math.max(0, 1 - dy / content.offsetHeight)) : '';
    }
  };

  const onPointerDown = (e: PointerEvent<HTMLDivElement>) => {
    if (!enabled || e.button !== 0 || !isSheet()) return;
    // Кнопка «Закрыть» в заголовке должна оставаться обычной кнопкой.
    if ((e.target as HTMLElement).closest('button, a, input, textarea, select')) return;
    // Без этого перетаскивание мышью/стилусом выделяет текст формы под ручкой.
    e.preventDefault();
    e.currentTarget.setPointerCapture(e.pointerId);
    drag.current = {
      pointerId: e.pointerId,
      startY: e.clientY,
      lastY: e.clientY,
      lastTime: e.timeStamp,
      velocity: 0,
      dy: 0,
    };
    apply(0, false);
  };

  const onPointerMove = (e: PointerEvent<HTMLDivElement>) => {
    const d = drag.current;
    if (!d || d.pointerId !== e.pointerId) return;
    const dt = Math.max(1, e.timeStamp - d.lastTime);
    d.velocity = (e.clientY - d.lastY) / dt;
    d.lastY = e.clientY;
    d.lastTime = e.timeStamp;
    d.dy = Math.max(0, e.clientY - d.startY);
    apply(d.dy, false);
  };

  const finish = (e: PointerEvent<HTMLDivElement>, cancelled: boolean) => {
    const d = drag.current;
    if (!d || d.pointerId !== e.pointerId) return;
    drag.current = null;
    const height = contentRef.current?.offsetHeight ?? 0;
    const shouldClose =
      !cancelled &&
      d.dy > 0 &&
      (d.dy > Math.min(CLOSE_DISTANCE_MAX, height / 4) || d.velocity > CLOSE_VELOCITY);
    if (!shouldClose) {
      apply(0, true);
      return;
    }
    apply(height, true);
    window.setTimeout(onClose, reducedMotion() ? 0 : ANIMATION_MS);
  };

  return {
    contentRef,
    overlayRef,
    dragHandlers: {
      onPointerDown,
      onPointerMove,
      onPointerUp: (e: PointerEvent<HTMLDivElement>) => finish(e, false),
      onPointerCancel: (e: PointerEvent<HTMLDivElement>) => finish(e, true),
    },
  };
}
