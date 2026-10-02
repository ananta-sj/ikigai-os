import { useCallback, useEffect, useId, useRef, useState } from 'react';

export interface ConfirmDialogOptions {
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  tone?: 'default' | 'danger';
}

interface ConfirmDialogProps extends ConfirmDialogOptions {
  onConfirm: () => void;
  onCancel: () => void;
}

function ConfirmDialog({ title, message, confirmLabel = 'Continue', cancelLabel = 'Cancel', tone = 'default', onConfirm, onCancel }: ConfirmDialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const cancelRef = useRef<HTMLButtonElement>(null);
  const titleId = useId();
  const descriptionId = useId();

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (!dialog.open) dialog.showModal();
    const frame = window.requestAnimationFrame(() => cancelRef.current?.focus({ preventScroll: true }));
    return () => {
      window.cancelAnimationFrame(frame);
      if (dialog.open) dialog.close();
    };
  }, []);

  return (
    <dialog
      ref={dialogRef}
      className={`ik-confirm-dialog${tone === 'danger' ? ' is-danger' : ''}`}
      aria-labelledby={titleId}
      aria-describedby={descriptionId}
      onCancel={event => {
        event.preventDefault();
        onCancel();
      }}
    >
      <div className="ik-confirm-dialog-copy">
        <span className="ik-section-kicker">CONFIRM</span>
        <h2 id={titleId}>{title}</h2>
        <p id={descriptionId}>{message}</p>
      </div>
      <div className="ik-confirm-dialog-actions">
        <button ref={cancelRef} type="button" className="ik-button ik-button-quiet" onClick={onCancel}>{cancelLabel}</button>
        <button type="button" className={tone === 'danger' ? 'danger-button danger-button-solid' : 'ik-button ik-button-primary'} onClick={onConfirm}>{confirmLabel}</button>
      </div>
    </dialog>
  );
}

export function useConfirmDialog() {
  const [request, setRequest] = useState<ConfirmDialogOptions | null>(null);
  const resolverRef = useRef<((value: boolean) => void) | null>(null);

  const settle = useCallback((value: boolean) => {
    const resolve = resolverRef.current;
    resolverRef.current = null;
    setRequest(null);
    resolve?.(value);
  }, []);

  const confirm = useCallback((options: ConfirmDialogOptions) => {
    resolverRef.current?.(false);
    return new Promise<boolean>(resolve => {
      resolverRef.current = resolve;
      setRequest(options);
    });
  }, []);

  useEffect(() => () => resolverRef.current?.(false), []);

  return {
    confirm,
    confirmDialog: request ? <ConfirmDialog {...request} onConfirm={() => settle(true)} onCancel={() => settle(false)} /> : null
  };
}
