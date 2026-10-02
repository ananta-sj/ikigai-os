import type { ButtonHTMLAttributes, ReactNode } from 'react';

type ButtonVariant = 'primary' | 'secondary' | 'quiet';
type ButtonSize = 'sm' | 'md' | 'lg';

interface IkButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  iconOnly?: boolean;
  children: ReactNode;
}

export function IkButton({ variant = 'secondary', size = 'md', iconOnly = false, className = '', type = 'button', children, ...props }: IkButtonProps) {
  const classes = [
    'ik-button',
    variant === 'primary' ? 'ik-button-primary' : variant === 'quiet' ? 'ik-button-quiet' : '',
    size === 'sm' ? 'ik-button-sm' : size === 'lg' ? 'ik-button-lg' : '',
    iconOnly ? 'ik-button-icon' : '',
    className
  ].filter(Boolean).join(' ');

  return <button type={type} className={classes} {...props}>{children}</button>;
}
