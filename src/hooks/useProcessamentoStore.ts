import { create } from 'zustand';
import type { PendenciaFuncionarioNovo, ResultadoProcessamentoFoto } from '@services/processamentoService';

interface ProcessamentoState {
  processando: boolean;
  progresso: { atual: number; total: number };
  filaPendencias: PendenciaFuncionarioNovo[];
  pendenciaAtual: PendenciaFuncionarioNovo | null;
  resultados: ResultadoProcessamentoFoto[];
  erro: string | null;

  iniciar: (totalFotos: number) => void;
  avancarProgresso: () => void;
  registrarResultado: (resultado: ResultadoProcessamentoFoto) => void;
  enfileirarPendencias: (pendencias: PendenciaFuncionarioNovo[]) => void;
  resolverPendenciaAtual: () => void;
  finalizar: () => void;
  definirErro: (mensagem: string) => void;
  reiniciar: () => void;
}

export const useProcessamentoStore = create<ProcessamentoState>((set, get) => ({
  processando: false,
  progresso: { atual: 0, total: 0 },
  filaPendencias: [],
  pendenciaAtual: null,
  resultados: [],
  erro: null,

  iniciar: (totalFotos) =>
    set({
      processando: true,
      progresso: { atual: 0, total: totalFotos },
      filaPendencias: [],
      pendenciaAtual: null,
      resultados: [],
      erro: null
    }),

  avancarProgresso: () =>
    set((estado) => ({ progresso: { ...estado.progresso, atual: estado.progresso.atual + 1 } })),

  registrarResultado: (resultado) =>
    set((estado) => ({ resultados: [...estado.resultados, resultado] })),

  enfileirarPendencias: (pendencias) => {
    const { filaPendencias, pendenciaAtual } = get();
    const novaFila = [...filaPendencias, ...pendencias];
    set({
      filaPendencias: novaFila,
      pendenciaAtual: pendenciaAtual ?? novaFila[0] ?? null
    });
  },

  /** Remove a pendência resolvida da fila e ativa a próxima automaticamente. */
  resolverPendenciaAtual: () => {
    const { filaPendencias } = get();
    const [, ...resto] = filaPendencias;
    set({ filaPendencias: resto, pendenciaAtual: resto[0] ?? null });
  },

  finalizar: () => set({ processando: false }),

  definirErro: (mensagem) => set({ erro: mensagem, processando: false }),

  reiniciar: () =>
    set({
      processando: false,
      progresso: { atual: 0, total: 0 },
      filaPendencias: [],
      pendenciaAtual: null,
      resultados: [],
      erro: null
    })
}));
