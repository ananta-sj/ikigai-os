import { useEffect, useRef } from 'react';

const FOCUSABLE_SELECTOR = [
  'a[href]',
  'button:not([disabled])',
  'input:not([disabled]):not([type="hidden"])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])'
].join(',');

interface DialogFocusOptions {
  lockScroll?: boolean;
}

let bodyScrollLocks = 0;
let previousBodyOverflow = '';
let previousBodyPaddingRight = '';

function acquireBodyScrollLock() {
  if (typeof document === 'undefined' || typeof window === 'undefined') return () => undefined;

  if (bodyScrollLocks === 0) {
    const body = document.body;
    previousBodyOverflow = body.style.overflow;
    previousBodyPaddingRight = body.style.paddingRight;

    // Compensate for a disappearing desktop scrollbar so opening a modal does
    // not make the accepted page composition jump sideways.
    const scrollbar = Math.max(0, window.innerWidth - document.documentElement.clientWidth);
    if (scrollbar > 0) {
      const currentPadding = Number.parseFloat(window.getComputedStyle(body).paddingRight) || 0;
      body.style.paddingRight = `${currentPadding + scrollbar}px`;
    }
    body.style.overflow = 'hidden';
  }

  bodyScrollLocks += 1;
  let released = false;
  return () => {
    if (released) return;
    released = true;
    bodyScrollLocks = Math.max(0, bodyScrollLocks - 1);
    if (bodyScrollLocks > 0) return;
    document.body.style.overflow = previousBodyOverflow;
    document.body.style.paddingRight = previousBodyPaddingRight;
  };
}

export function useDialogFocus<T extends HTMLElement>(
  active = true,
  onClose?: () => void,
  options: DialogFocusOptions = {}
) {
  const dialogRef = useRef<T>(null);
  const onCloseRef = useRef(onClose);
  const lockScroll = options.lockScroll ?? true;

  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    if (!active || typeof document === 'undefined') return;
    const previous = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const releaseScroll = lockScroll ? acquireBodyScrollLock() : () => undefined;
    const frame = window.requestAnimationFrame(() => {
      dialogRef.current?.focus({ preventScroll: true });
    });

    const onKeyDown = (event: KeyboardEvent) => {
      const root = dialogRef.current;
      if (!root) return;
      if (event.key === 'Escape' && onCloseRef.current) {
        event.preventDefault();
        onCloseRef.current();
        return;
      }
      if (event.key !== 'Tab') return;

      const focusable = [...root.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)]
        .filter(element => !element.hasAttribute('disabled') && element.getAttribute('aria-hidden') !== 'true');
      if (!focusable.length) {
        event.preventDefault();
        root.focus({ preventScroll: true });
        return;
      }

      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      const current = document.activeElement;
      if (event.shiftKey && (current === first || !root.contains(current))) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && current === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener('keydown', onKeyDown);
    return () => {
      window.cancelAnimationFrame(frame);
      document.removeEventListener('keydown', onKeyDown);
      releaseScroll();
      if (previous?.isConnected) previous.focus({ preventScroll: true });
    };
  }, [active, lockScroll]);

  return dialogRef;
}
