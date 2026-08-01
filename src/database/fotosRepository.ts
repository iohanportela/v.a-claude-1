import { db } from './db';
import type { Foto, NovaFoto } from '@domain/domain';
import { v4 as uuid } from 'uuid';

export const fotosRepository = {
  async listarPorMesa(mesa: string): Promise<Foto[]> {
    return db.fotos.where('mesa').equals(mesa).sortBy('capturadaEm');
  },

  async buscarPorId(id: string): Promise<Foto | undefined> {
    return db.fotos.get(id);
  },

  async listarNaoProcessadas(): Promise<Foto[]> {
    return db.fotos.filter((foto) => !foto.processada).sortBy('capturadaEm');
  },

  async criar(dados: NovaFoto): Promise<Foto> {
    const foto: Foto = {
      id: uuid(),
      mesa: dados.mesa.trim(),
      imagem: dados.imagem,
      largura: dados.largura,
      altura: dados.altura,
      capturadaEm: Date.now(),
      processada: false
    };
    await db.fotos.add(foto);
    return foto;
  },

  async marcarProcessada(id: string): Promise<void> {
    await db.fotos.update(id, { processada: true });
  },

  async remover(id: string): Promise<void> {
    await db.transaction('rw', db.fotos, db.leituras, async () => {
      await db.leituras.where('fotoId').equals(id).delete();
      await db.fotos.delete(id);
    });
  },

  /** URL de objeto local para exibir a imagem (deve ser revogada após uso). */
  criarUrlObjeto(foto: Foto): string {
    return URL.createObjectURL(foto.imagem);
  }
};
