import { useLiveQuery } from 'dexie-react-hooks';
import { useMemo, useState } from 'react';
import { funcionariosRepository } from '@database/index';
import type { Funcionario, MapaMesaPosicao } from '@types/domain';

/** Lista reativa de todas as mesas cadastradas, atualizada automaticamente. */
export function useMesas(): string[] {
  return useLiveQuery(() => funcionariosRepository.listarMesas(), [], []) ?? [];
}

/** Mapa reativo das 24 posições de uma mesa (ocupadas/vazias). */
export function useMapaMesa(mesa: string | null): MapaMesaPosicao[] {
  return (
    useLiveQuery(
      () => (mesa ? funcionariosRepository.obterMapaMesa(mesa) : Promise.resolve([])),
      [mesa],
      []
    ) ?? []
  );
}

export function useLayoutVisualMesa(): readonly number[][] {
  return useMemo(() => funcionariosRepository.obterLayoutVisual(), []);
}

export function useFuncionario(id: string | null): Funcionario | undefined {
  return useLiveQuery(() => (id ? funcionariosRepository.buscarPorId(id) : undefined), [id]);
}

/** Pesquisa instantânea reativa por nome ou matrícula, com debounce leve. */
export function usePesquisaFuncionarios(): {
  termo: string;
  setTermo: (valor: string) => void;
  resultados: Funcionario[];
} {
  const [termo, setTermo] = useState('');

  const resultados =
    useLiveQuery(() => funcionariosRepository.pesquisar(termo), [termo], []) ?? [];

  return { termo, setTermo, resultados };
}
