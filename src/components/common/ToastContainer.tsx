import { useUiStore } from '@hooks/useUiStore';
import clsx from 'clsx';

const CORES: Record<string, string> = {
  sucesso: 'bg-success-600',
  erro: 'bg-danger-600',
  info: 'bg-base-700'
};

export function ToastContainer(): JSX.Element {
  const toasts = useUiStore((estado) => estado.toasts);
  const removerToast = useUiStore((estado) => estado.removerToast);

  if (toasts.length === 0) {
    return <></>;
  }

  return (
    <div className="pointer-events-none fixed inset-x-0 top-4 z-50 flex flex-col items-center gap-2 px-4">
      {toasts.map((toast) => (
        <button
          key={toast.id}
          type="button"
          onClick={() => removerToast(toast.id)}
          className={clsx(
            'pointer-events-auto w-full max-w-md rounded-xl px-4 py-3 text-left text-sm font-medium text-white shadow-lg',
            CORES[toast.tipo]
          )}
        >
          {toast.mensagem}
        </button>
      ))}
    </div>
  );
}
