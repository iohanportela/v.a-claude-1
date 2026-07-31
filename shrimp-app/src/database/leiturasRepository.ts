import { db } from './db';
import type { Leitura, NovaLeitura } from '@types/domain';
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
    const colecao = mesaFiltro
      ? db.leituras.where('mesa').equals(mesaFiltro)
      : db.leituras.toCollection();

    const leituras = await colecao.toArray();
    return leituras.sort((a, b) => {
      if (a.mesa !== b.mesa) return a.mesa.localeCompare(b.mesa, 'pt-BR', { numeric: true });
      return a.ordem - b.ordem;
    });
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
