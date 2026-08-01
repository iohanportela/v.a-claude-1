import { db } from './db';
import type { Leitura, NovaLeitura } from '@domain/domain';
import { v4 as uuid } from 'uuid';

export const leiturasRepository = {
  async listarPorFoto(fotoId: string): Promise<Leitura[]> {
    return db.leituras.where('fotoId').equals(fotoId).sortBy('ordem');
  },

  async listarPorMesa(mesa: string): Promise<Leitura[]> {
    return db.leituras.where('mesa').equals(mesa).sortBy('ordem');
  },

  async buscarPorId(id: string): Promise<Leitura | undefined> {
    return db.leituras.get(id);
  },

  async buscarPorMatricula(matricula: string): Promise<Leitura | undefined> {
    return db.leituras.where('matricula').equals(matricula.trim()).first();
  },

  /**
   * Lista global ordenada de leituras usada pela tela de Navegação:
   * concatena todas as mesas/fotos em ordem estável (mesa, depois ordem
   * de produtividade dentro da mesa), permitindo avançar/voltar de forma
   * contínua e trocar de foto automaticamente quando necessário.
   */
  async listarParaNavegacao(mesaFiltro?: string): Promise<Leitura[]> {
    if (!mesaFiltro) {
      return db.leituras.toArray();
    }

    const mesaRegistro = await db.mesas.where('nome').equals(mesaFiltro.trim()).first();
    if (!mesaRegistro) {
      return [];
    }

    const lugares = await db.lugares.where('mesaId').equals(mesaRegistro.id).sortBy('numeroPosicao');
    const leituras = await db.leituras.where('mesa').equals(mesaFiltro.trim()).toArray();
    const leiturasPorFuncionario = new Map<string, Leitura>();

    for (const leitura of leituras) {
      if (leitura.funcionarioId) {
        leiturasPorFuncionario.set(leitura.funcionarioId, leitura);
      }
    }

    const ordenadas: Leitura[] = [];
    for (const lugar of lugares) {
      if (!lugar.funcionarioId) continue;
      const leitura = leiturasPorFuncionario.get(lugar.funcionarioId);
      if (leitura) {
        ordenadas.push(leitura);
      }
    }

    return ordenadas;
  },

  /**
   * Registra uma nova leitura, respeitando a regra de deduplicação:
   * se a matrícula já existe em QUALQUER leitura (mesma mesa, foto
   * diferente), a nova leitura é descartada e a primeira é mantida.
   * Retorna null quando a leitura foi descartada por duplicidade.
   */
  async registrarComDeduplicacao(dados: NovaLeitura): Promise<Leitura | null> {
    const jaExiste = await this.buscarPorMatricula(dados.matricula);
    if (jaExiste) {
      return null;
    }

    const leitura: Leitura = {
      id: uuid(),
      ...dados,
      criadaEm: Date.now()
    };
    await db.leituras.add(leitura);
    return leitura;
  },

  async vincularFuncionario(leituraId: string, funcionarioId: string): Promise<void> {
    await db.leituras.update(leituraId, { funcionarioId });
  },

  async remover(id: string): Promise<void> {
    await db.leituras.delete(id);
  },

  async limparPorFoto(fotoId: string): Promise<void> {
    await db.leituras.where('fotoId').equals(fotoId).delete();
  }
};
