import { db } from './db';
import type { Funcionario, NovoFuncionario, MapaMesaPosicao } from '@types/domain';
import { LAYOUT_MESA, POSICOES_POR_MESA } from '@types/domain';
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

  async listarPorMesa(mesa: string): Promise<Funcionario[]> {
    return db.funcionarios.where('mesa').equals(mesa).sortBy('posicao');
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
   * Retorna as 24 posições de uma mesa, já resolvidas com o funcionário
   * ocupante (ou null se vazia). Usado no mapa visual da mesa.
   */
  async obterMapaMesa(mesa: string): Promise<MapaMesaPosicao[]> {
    const funcionarios = await this.listarPorMesa(mesa);
    const porPosicao = new Map(funcionarios.map((f) => [f.posicao, f]));

    const mapa: MapaMesaPosicao[] = [];
    for (let posicao = 1; posicao <= POSICOES_POR_MESA; posicao++) {
      const funcionario = porPosicao.get(posicao) ?? null;
      mapa.push({ posicao, ocupada: funcionario !== null, funcionario });
    }
    return mapa;
  },

  /** Retorna o layout visual fixo (duas fileiras de 12) para renderização. */
  obterLayoutVisual(): readonly number[][] {
    return LAYOUT_MESA;
  },

  async listarMesas(): Promise<string[]> {
    const funcionarios = await db.funcionarios.toArray();
    const mesas = new Set(funcionarios.map((f) => f.mesa));
    return Array.from(mesas).sort((a, b) => a.localeCompare(b, 'pt-BR', { numeric: true }));
  },

  async criar(dados: NovoFuncionario): Promise<Funcionario> {
    await validarPosicaoDisponivel(dados.mesa, dados.posicao, null);
    await validarMatriculaUnica(dados.matricula, null);

    const agora = Date.now();
    const funcionario: Funcionario = {
      id: uuid(),
      matricula: dados.matricula.trim(),
      nome: dados.nome.trim(),
      mesa: dados.mesa.trim(),
      posicao: dados.posicao,
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

    await validarPosicaoDisponivel(dados.mesa, dados.posicao, id);
    await validarMatriculaUnica(dados.matricula, id);

    const atualizado: Funcionario = {
      ...existente,
      matricula: dados.matricula.trim(),
      nome: dados.nome.trim(),
      mesa: dados.mesa.trim(),
      posicao: dados.posicao,
      atualizadoEm: Date.now()
    };

    await db.funcionarios.put(atualizado);
    return atualizado;
  },

  async remover(id: string): Promise<void> {
    await db.funcionarios.delete(id);
  },

  /**
   * Usado pela importação de planilha e pelo modal de funcionário novo do OCR:
   * cadastra se a matrícula não existir, atualiza nome/mesa/posição se existir.
   */
  async cadastrarOuAtualizarPorMatricula(dados: NovoFuncionario): Promise<Funcionario> {
    const existente = await this.buscarPorMatricula(dados.matricula);
    if (existente) {
      return this.atualizar(existente.id, dados);
    }
    return this.criar(dados);
  }
};

async function validarPosicaoDisponivel(
  mesa: string,
  posicao: number,
  ignorarId: string | null
): Promise<void> {
  if (posicao < 1 || posicao > POSICOES_POR_MESA) {
    throw new Error(`Posição deve estar entre 1 e ${POSICOES_POR_MESA}.`);
  }

  const ocupante = await db.funcionarios.where({ mesa, posicao }).first();
  if (ocupante && ocupante.id !== ignorarId) {
    throw new Error(
      `A posição ${posicao} da ${mesa} já está ocupada por ${ocupante.nome}.`
    );
  }
}

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
