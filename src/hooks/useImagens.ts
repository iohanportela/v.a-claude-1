import { useLiveQuery } from 'dexie-react-hooks';
import { imagensRepository } from '@database/index';
import type { Imagem } from '@domain/domain';

export function useImagens(): Imagem[] {
  return useLiveQuery(() => imagensRepository.listarTodas(), [], []) ?? [];
}

export function useImagem(id: string | null): Imagem | undefined {
  return useLiveQuery(() => (id ? imagensRepository.buscarPorId(id) : undefined), [id]);
}
