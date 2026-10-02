import type { ReactNode } from 'react';

interface LoadingStateProps {
  icon?: ReactNode;
  title: ReactNode;
  detail?: ReactNode;
  compact?: boolean;
  className?: string;
}

export function LoadingState({ icon, title, detail, compact = false, className = '' }: LoadingStateProps) {
  const classes = ['ik-loading-state', compact ? 'is-compact' : '', className].filter(Boolean).join(' ');

  return (
    <div className={classes} role="status" aria-live="polite" aria-busy="true">
      {icon ? <span className="ik-loading-state-icon" aria-hidden="true">{icon}</span> : null}
      <div><strong>{title}</strong>{detail ? <small>{detail}</small> : null}</div>
    </div>
  );
}
