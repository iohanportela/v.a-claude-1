import { db } from './db';
import type { Imagem, NovaImagem } from '@domain/domain';
import { v4 as uuid } from 'uuid';

export const imagensRepository = {
  async listarTodas(): Promise<Imagem[]> {
    const todas = await db.imagens.toArray();
    return todas.sort((a, b) => b.importadaEm - a.importadaEm);
  },

  async buscarPorId(id: string): Promise<Imagem | undefined> {
    return db.imagens.get(id);
  },

  async criar(dados: NovaImagem): Promise<Imagem> {
    const imagem: Imagem = {
      id: uuid(),
      nome: dados.nome.trim() || 'Sem nome',
      imagem: dados.imagem,
      largura: dados.largura,
      altura: dados.altura,
      importadaEm: Date.now(),
      ocrProcessado: false
    };
    await db.imagens.add(imagem);
    return imagem;
  },

  async marcarOcrProcessado(id: string): Promise<void> {
    await db.imagens.update(id, { ocrProcessado: true });
  },

  /** Remove a imagem e todas as palavras associadas a ela. */
  async remover(id: string): Promise<void> {
    await db.transaction('rw', db.imagens, db.palavras, async () => {
      await db.palavras.where('imagemId').equals(id).delete();
      await db.imagens.delete(id);
    });
  },

  /** URL de objeto local para exibir a imagem (deve ser revogada após uso). */
  criarUrlObjeto(imagem: Imagem): string {
    return URL.createObjectURL(imagem.imagem);
  }
};
