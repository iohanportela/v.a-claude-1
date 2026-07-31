import type { ReactNode } from 'react';
import { useEffect } from 'react';
import { createPortal } from 'react-dom';

interface ModalProps {
  aberto: boolean;
  titulo: string;
  onFechar: (() => void) | null;
  children: ReactNode;
}

export function Modal({ aberto, titulo, onFechar, children }: ModalProps): JSX.Element | null {
  useEffect(() => {
    if (!aberto) return;
    const original = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = original;
    };
  }, [aberto]);

  if (!aberto) return null;

  return createPortal(
    <div className="fixed inset-0 z-40 flex items-end justify-center bg-black/70 sm:items-center">
      <div className="max-h-[92vh] w-full max-w-lg overflow-y-auto rounded-t-2xl bg-base-900 p-5 sm:rounded-2xl">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-bold text-base-50">{titulo}</h2>
          {onFechar ? (
            <button
              type="button"
              onClick={onFechar}
              className="rounded-full p-2 text-base-400 hover:bg-base-800 hover:text-base-50"
              aria-label="Fechar"
            >
              <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={2}>
                <path d="M6 6l12 12M18 6 6 18" strokeLinecap="round" />
              </svg>
            </button>
          ) : null}
        </div>
        {children}
      </div>
    </div>,
    document.body
  );
}
