import { db } from './db';
import { v4 as uuid } from 'uuid';
import type { Mesa, NovaMesa } from '@domain/domain';
import { lugaresRepository } from './lugaresRepository';

export const mesasRepository = {
  async listarTodos(): Promise<Mesa[]> {
    return db.mesas.orderBy('nome').toArray();
  },

  async listarNomes(): Promise<string[]> {
    return (await this.listarTodos()).map((mesa) => mesa.nome);
  },

  async buscarPorId(id: string): Promise<Mesa | undefined> {
    return db.mesas.get(id);
  },

  async buscarPorNome(nome: string): Promise<Mesa | undefined> {
    return db.mesas.where('nome').equals(nome.trim()).first();
  },

  async criar(dados: NovaMesa): Promise<Mesa> {
    const nome = dados.nome.trim();
    if (!nome) {
      throw new Error('Nome da mesa é obrigatório.');
    }

    const existente = await this.buscarPorNome(nome);
    if (existente) {
      throw new Error(`A mesa ${nome} já existe.`);
    }

    const agora = Date.now();
    const mesa: Mesa = {
      id: uuid(),
      nome,
      criadoEm: agora,
      atualizadoEm: agora
    };

    await db.mesas.add(mesa);
    await lugaresRepository.criarLugaresParaMesa(mesa.id);
    return mesa;
  },

  async remover(id: string): Promise<void> {
    await db.transaction('rw', db.mesas, db.lugares, async () => {
      await db.lugares.where('mesaId').equals(id).delete();
      await db.mesas.delete(id);
    });
  },

  async atualizar(id: string, dados: NovaMesa): Promise<void> {
    const nome = dados.nome.trim();
    if (!nome) {
      throw new Error('Nome da mesa é obrigatório.');
    }
    await db.mesas.update(id, { nome, atualizadoEm: Date.now() });
  }
};
