import type { ReactNode } from 'react';

interface PageHeaderProps {
  eyebrow: ReactNode;
  title: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
  meta?: ReactNode;
  compact?: boolean;
  className?: string;
}

export function PageHeader({ eyebrow, title, description, actions, meta, compact = false, className = '' }: PageHeaderProps) {
  const classes = ['ik-page-header', compact ? 'is-compact' : '', className].filter(Boolean).join(' ');

  return (
    <header className={classes}>
      <div className="ik-page-header-copy">
        <div className="ik-page-eyebrow">{eyebrow}</div>
        <h1 className="ik-page-title">{title}</h1>
        {description ? <p className="ik-page-description">{description}</p> : null}
      </div>
      {actions ? <div className="ik-page-actions">{actions}</div> : null}
      {meta ? <div className="ik-page-meta">{meta}</div> : null}
    </header>
  );
}
