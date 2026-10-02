import type { SVGProps } from 'react';

/**
 * Canonical Ikigai OS product mark.
 *
 * The sprout is intentionally independent from workspace/theme glyphs. Theme
 * kanji/labels can change with the material system; the product identity does not.
 */
export function IkigaiMark({ className, ...props }: SVGProps<SVGSVGElement>) {
  return (
    <svg
      className={className ? `ikigai-mark ${className}` : 'ikigai-mark'}
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
      focusable="false"
      {...props}
    >
      <path
        d="M12 19.15V10.7"
        stroke="currentColor"
        strokeWidth="1.85"
        strokeLinecap="round"
      />
      <path
        d="M11.75 11.2C8.85 11.22 6.35 9.86 5.55 7.18c2.62-.92 5.36-.25 6.72 1.93-.04.74-.2 1.45-.52 2.09Z"
        fill="currentColor"
      />
      <path
        d="M12.22 10.95c.42-3.2 2.62-5.36 5.98-5.7.62 2.88-.63 5.43-3.34 6.46-.96.37-1.86.43-2.64.29v-1.05Z"
        fill="currentColor"
      />
    </svg>
  );
}
