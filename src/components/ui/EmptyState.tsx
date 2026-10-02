import type { ReactNode } from 'react';

interface EmptyStateProps {
  icon?: ReactNode;
  eyebrow?: ReactNode;
  title: ReactNode;
  description?: ReactNode;
  action?: ReactNode;
  secondaryAction?: ReactNode;
  children?: ReactNode;
  compact?: boolean;
  className?: string;
}

export function EmptyState({
  icon,
  eyebrow,
  title,
  description,
  action,
  secondaryAction,
  children,
  compact = false,
  className = ''
}: EmptyStateProps) {
  const classes = ['ik-empty-state', compact ? 'is-compact' : '', className].filter(Boolean).join(' ');

  return (
    <div className={classes}>
      {icon ? <div className="ik-empty-state-icon" aria-hidden="true">{icon}</div> : null}
      <div className="ik-empty-state-copy">
        {eyebrow ? <div className="ik-section-kicker">{eyebrow}</div> : null}
        <h2>{title}</h2>
        {description ? <p>{description}</p> : null}
      </div>
      {action || secondaryAction ? <div className="ik-empty-state-actions">{action}{secondaryAction}</div> : null}
      {children ? <div className="ik-empty-state-extra">{children}</div> : null}
    </div>
  );
}
