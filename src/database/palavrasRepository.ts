import { db } from './db';
import type { Palavra, NovaPalavra } from '@domain/domain';
import { v4 as uuid } from 'uuid';
import { normalizarTexto } from '@utils/texto';

export const palavrasRepository = {
  async listarPorImagem(imagemId: string): Promise<Palavra[]> {
    return db.palavras.where('imagemId').equals(imagemId).toArray();
  },

  /**
   * Grava todas as palavras reconhecidas pelo OCR de uma imagem, de uma
   * vez só. Chamada exatamente uma vez, no momento da importação — depois
   * disso o OCR nunca mais roda para essa imagem, e toda busca é feita
   * sobre esses registros.
   */
  async registrarLote(
    imagemId: string,
    palavras: Array<Omit<NovaPalavra, 'imagemId' | 'textoNormalizado'>>
  ): Promise<void> {
    const registros: Palavra[] = palavras.map((p) => ({
      id: uuid(),
      imagemId,
      texto: p.texto,
      textoNormalizado: normalizarTexto(p.texto),
      boundingBox: p.boundingBox,
      confidence: p.confidence
    }));

    await db.palavras.bulkAdd(registros);
  },

  /**
   * Busca instantânea, parcial, sem diferenciar maiúsculas/minúsculas ou
   * acentuação: retorna toda palavra cujo texto normalizado contenha o
   * termo buscado (também normalizado).
   */
  async pesquisar(termo: string): Promise<Palavra[]> {
    const termoNormalizado = normalizarTexto(termo);
    if (!termoNormalizado) return [];

    return db.palavras.filter((p) => p.textoNormalizado.includes(termoNormalizado)).toArray();
  }
};
