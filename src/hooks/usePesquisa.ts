import { useLiveQuery } from 'dexie-react-hooks';
import { useState } from 'react';
import { pesquisar } from '@services/buscaService';
import type { ResultadoBusca } from '@domain/domain';

export function usePesquisa(): {
  termo: string;
  setTermo: (valor: string) => void;
  resultados: ResultadoBusca[];
  buscando: boolean;
} {
  const [termo, setTermo] = useState('');

  const resultados = useLiveQuery(() => pesquisar(termo), [termo], []) ?? [];

  return { termo, setTermo, resultados, buscando: termo.trim().length > 0 };
}
