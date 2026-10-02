import type { AnchorHTMLAttributes, ReactNode } from 'react';
import { safeExternalHref } from '../../lib/security';

export function SafeExternalLink({ href, children, ...props }: Omit<AnchorHTMLAttributes<HTMLAnchorElement>, 'href' | 'target' | 'rel' | 'referrerPolicy'> & { href?: string | null; children: ReactNode }) {
  const safe = safeExternalHref(href);
  if (!safe) return null;
  return (
    <a
      {...props}
      href={safe}
      target="_blank"
      rel="noopener noreferrer"
      referrerPolicy="no-referrer"
    >
      {children}
    </a>
  );
}
