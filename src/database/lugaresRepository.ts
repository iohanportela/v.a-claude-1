import { db } from './db';
import { v4 as uuid } from 'uuid';
import type { Lugar } from '@domain/domain';
import { POSICOES_POR_MESA } from '@domain/domain';

export const lugaresRepository = {
  async listarPorMesaId(mesaId: string): Promise<Lugar[]> {
    return db.lugares.where('mesaId').equals(mesaId).sortBy('numeroPosicao');
  },

  async buscarPorId(id: string): Promise<Lugar | undefined> {
    return db.lugares.get(id);
  },

  async buscarPorMesaIdENumero(mesaId: string, numeroPosicao: number): Promise<Lugar | undefined> {
    return db.lugares.where('[mesaId+numeroPosicao]').equals([mesaId, numeroPosicao]).first();
  },

  async criarLugaresParaMesa(mesaId: string): Promise<void> {
    const lugares: Lugar[] = [];
    for (let numeroPosicao = 1; numeroPosicao <= POSICOES_POR_MESA; numeroPosicao++) {
      lugares.push({
        id: uuid(),
        mesaId,
        numeroPosicao,
        funcionarioId: null
      });
    }
    await db.lugares.bulkAdd(lugares);
  },

  async vincularFuncionario(lugarId: string, funcionarioId: string | null): Promise<void> {
    await db.lugares.update(lugarId, { funcionarioId });
  },

  async atribuirFuncionarioAoLugar(
    mesaId: string,
    numeroPosicao: number,
    funcionarioId: string | null
  ): Promise<void> {
    const lugar = await this.buscarPorMesaIdENumero(mesaId, numeroPosicao);
    if (!lugar) {
      throw new Error(`Lugar ${numeroPosicao} não encontrado na mesa selecionada.`);
    }

    await db.transaction('rw', db.lugares, async () => {
      if (funcionarioId) {
        await db.lugares.where('funcionarioId').equals(funcionarioId).modify({ funcionarioId: null });
      }
      await db.lugares.update(lugar.id, { funcionarioId });
    });
  },

  async limparPorMesa(mesaId: string): Promise<void> {
    await db.lugares.where('mesaId').equals(mesaId).delete();
  }
};
