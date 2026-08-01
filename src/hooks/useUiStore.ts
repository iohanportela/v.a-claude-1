import { create } from 'zustand';

export type TipoToast = 'sucesso' | 'erro' | 'info';

export interface ToastItem {
  id: string;
  tipo: TipoToast;
  mensagem: string;
}

interface UiState {
  toasts: ToastItem[];
  mostrarToast: (mensagem: string, tipo?: TipoToast) => void;
  removerToast: (id: string) => void;
}

export const useUiStore = create<UiState>((set) => ({
  toasts: [],

  mostrarToast: (mensagem, tipo = 'info') => {
    const id = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    set((estado) => ({ toasts: [...estado.toasts, { id, tipo, mensagem }] }));

    setTimeout(() => {
      set((estado) => ({ toasts: estado.toasts.filter((t) => t.id !== id) }));
    }, 3500);
  },

  removerToast: (id) => set((estado) => ({ toasts: estado.toasts.filter((t) => t.id !== id) }))
}));
