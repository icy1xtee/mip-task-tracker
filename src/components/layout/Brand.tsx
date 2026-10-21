import { cx } from '@/components/ui/cx';

type BrandProps = {
  /**
   * sidebar — в сайдбаре: на планшете текст скрывается, остаётся знак (рейка 72px).
   * standalone — отдельно (экран входа): текст виден всегда, без отступов сайдбара.
   */
  variant?: 'sidebar' | 'standalone';
};

/** Знак и название приложения — единый источник для сайдбара и экрана входа. */
export function Brand({ variant = 'sidebar' }: BrandProps) {
  return (
    <div className={cx('brand', variant === 'standalone' && 'brand-standalone')}>
      <span className="brand-mark" aria-hidden="true">
        ⊹ ࣪
      </span>
      <span className="brand-text">
        <span className="brand-name">mip</span>
        <br />
        <span className="brand-sub">task tracker</span>
      </span>
    </div>
  );
}
