import { db } from './db';
import type { Funcionario, NovoFuncionario, MapaMesaPosicao } from '@domain/domain';
import { LAYOUT_MESA, POSICOES_POR_MESA } from '@domain/domain';
import { v4 as uuid } from 'uuid';

/**
 * Repositório de funcionários. Encapsula toda a lógica de acesso ao
 * IndexedDB relacionada a funcionários — nenhuma outra camada deve
 * chamar `db.funcionarios` diretamente.
 */
export const funcionariosRepository = {
  async listarTodos(): Promise<Funcionario[]> {
    return db.funcionarios.orderBy('nome').toArray();
  },

  async buscarPorId(id: string): Promise<Funcionario | undefined> {
    return db.funcionarios.get(id);
  },

  async buscarPorMatricula(matricula: string): Promise<Funcionario | undefined> {
    return db.funcionarios.where('matricula').equals(matricula.trim()).first();
  },

  /**
   * Busca instantânea por nome ou matrícula (case-insensitive, prefixo ou
   * substring). Usada na tela de Pesquisa.
   */
  async pesquisar(termo: string): Promise<Funcionario[]> {
    const termoNormalizado = termo.trim().toLowerCase();
    if (!termoNormalizado) return [];

    const todos = await db.funcionarios.toArray();
    return todos.filter(
      (f) =>
        f.nome.toLowerCase().includes(termoNormalizado) ||
        f.matricula.toLowerCase().includes(termoNormalizado)
    );
  },

  /**
   * Cria apenas o funcionário. A associação com a mesa/posição é feita por
   * meio de lugares separados.
   */
  async criar(dados: NovoFuncionario): Promise<Funcionario> {
    await validarMatriculaUnica(dados.matricula, null);

    const agora = Date.now();
    const funcionario: Funcionario = {
      id: uuid(),
      matricula: dados.matricula.trim(),
      nome: dados.nome.trim(),
      criadoEm: agora,
      atualizadoEm: agora
    };

    await db.funcionarios.add(funcionario);
    return funcionario;
  },

  async atualizar(id: string, dados: NovoFuncionario): Promise<Funcionario> {
    const existente = await db.funcionarios.get(id);
    if (!existente) {
      throw new Error('Funcionário não encontrado.');
    }

    await validarMatriculaUnica(dados.matricula, id);

    const atualizado: Funcionario = {
      ...existente,
      matricula: dados.matricula.trim(),
      nome: dados.nome.trim(),
      atualizadoEm: Date.now()
    };

    await db.funcionarios.put(atualizado);
    return atualizado;
  },

  async remover(id: string): Promise<void> {
    await db.transaction('rw', db.funcionarios, db.lugares, async () => {
      await db.lugares.where('funcionarioId').equals(id).modify({ funcionarioId: null });
      await db.funcionarios.delete(id);
    });
  },

  async listarMesas(): Promise<string[]> {
    const mesas = await db.mesas.orderBy('nome').toArray();
    return mesas.map((mesa) => mesa.nome);
  },

  async buscarLocalizacao(funcionarioId: string): Promise<{ mesa: string; posicao: number } | null> {
    const lugar = await db.lugares.where('funcionarioId').equals(funcionarioId).first();
    if (!lugar) return null;

    const mesa = await db.mesas.get(lugar.mesaId);
    if (!mesa) return null;

    return { mesa: mesa.nome, posicao: lugar.numeroPosicao };
  },

  async obterMapaMesa(mesa: string): Promise<MapaMesaPosicao[]> {
    const mesaRegistro = await db.mesas.where('nome').equals(mesa.trim()).first();
    if (!mesaRegistro) {
      return Array.from({ length: POSICOES_POR_MESA }, (_, index) => ({
        posicao: index + 1,
        ocupada: false,
        funcionario: null,
        lugarId: ''
      }));
    }

    const lugares = await db.lugares.where('mesaId').equals(mesaRegistro.id).sortBy('numeroPosicao');
    const funcionarios = await db.funcionarios.toArray();
    const porFuncionario = new Map(funcionarios.map((f) => [f.id, f]));

    return lugares.map((lugar) => ({
      lugarId: lugar.id,
      posicao: lugar.numeroPosicao,
      ocupada: lugar.funcionarioId !== null,
      funcionario: lugar.funcionarioId ? porFuncionario.get(lugar.funcionarioId) ?? null : null
    }));
  },

  /** Retorna o layout visual fixo (duas fileiras de 12) para renderização. */
  obterLayoutVisual(): readonly number[][] {
    return LAYOUT_MESA;
  },

  async cadastrarOuAtualizarPorMatricula(dados: NovoFuncionario): Promise<Funcionario> {
    const existente = await this.buscarPorMatricula(dados.matricula);
    if (existente) {
      return this.atualizar(existente.id, dados);
    }
    return this.criar(dados);
  }
};

async function validarMatriculaUnica(matricula: string, ignorarId: string | null): Promise<void> {
  const matriculaLimpa = matricula.trim();
  if (!matriculaLimpa) {
    throw new Error('Matrícula é obrigatória.');
  }

  const existente = await db.funcionarios.where('matricula').equals(matriculaLimpa).first();
  if (existente && existente.id !== ignorarId) {
    throw new Error(`A matrícula ${matriculaLimpa} já pertence a ${existente.nome}.`);
  }
}
