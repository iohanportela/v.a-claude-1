import { create } from 'zustand';
import type { Leitura } from '@domain/domain';

interface NavegacaoState {
  lista: Leitura[];
  indiceAtual: number;
  mesaFiltro: string | null;

  definirLista: (lista: Leitura[], indiceInicial?: number) => void;
  irPara: (indice: number) => void;
  proximo: () => void;
  anterior: () => void;
  leituraAtual: () => Leitura | null;
  fotoIdMudou: (fotoIdAnterior: string | null) => boolean;
}

export const useNavegacaoStore = create<NavegacaoState>((set, get) => ({
  lista: [],
  indiceAtual: 0,
  mesaFiltro: null,

  definirLista: (lista, indiceInicial = 0) =>
    set({ lista, indiceAtual: Math.min(Math.max(indiceInicial, 0), Math.max(lista.length - 1, 0)) }),

  irPara: (indice) => {
    const { lista } = get();
    if (indice < 0 || indice >= lista.length) return;
    set({ indiceAtual: indice });
  },

  proximo: () => {
    const { indiceAtual, lista } = get();
    if (indiceAtual < lista.length - 1) {
      set({ indiceAtual: indiceAtual + 1 });
    }
  },

  anterior: () => {
    const { indiceAtual } = get();
    if (indiceAtual > 0) {
      set({ indiceAtual: indiceAtual - 1 });
    }
  },

  leituraAtual: () => {
    const { lista, indiceAtual } = get();
    return lista[indiceAtual] ?? null;
  },

  /** Usado pelo componente de Navegação para saber se precisa trocar de <canvas>/imagem. */
  fotoIdMudou: (fotoIdAnterior) => {
    const atual = get().leituraAtual();
    return atual !== null && atual.fotoId !== fotoIdAnterior;
  }
}));
