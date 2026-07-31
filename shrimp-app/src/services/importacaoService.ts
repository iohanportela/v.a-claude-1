import * as XLSX from 'xlsx';
import { funcionariosRepository } from '@database/index';
import { POSICOES_POR_MESA } from '@types/domain';

export interface LinhaImportacao {
  mesa: string;
  posicao: number;
  nome: string;
  matricula: string;
}

export interface ResultadoImportacao {
  criados: number;
  atualizados: number;
  ignorados: Array<{ linha: number; motivo: string }>;
}

/**
 * Lê um arquivo de planilha (.xlsx/.csv) no formato: cada coluna é uma
 * mesa (cabeçalho = nome da mesa), cada célula de dados no formato
 * "posição: nome" ou "posição - nome" ou "matrícula posição: nome".
 *
 * Como a planilha do usuário não possui coluna de matrícula explícita
 * por padrão, aceitamos dois formatos de célula:
 *   "12: Maria"                  -> matrícula = gerada a partir de mesa+posição
 *   "00123 - 12: Maria"          -> matrícula explícita antes do "-"
 */
export async function lerPlanilhaFuncionarios(arquivo: File): Promise<LinhaImportacao[]> {
  const buffer = await arquivo.arrayBuffer();
  const workbook = XLSX.read(buffer, { type: 'array' });
  const primeiraAba = workbook.SheetNames[0];
  if (!primeiraAba) {
    throw new Error('A planilha não possui nenhuma aba.');
  }

  const planilha = workbook.Sheets[primeiraAba];
  if (!planilha) {
    throw new Error('Não foi possível ler a primeira aba da planilha.');
  }

  const linhas: unknown[][] = XLSX.utils.sheet_to_json(planilha, { header: 1, blankrows: false });
  const cabecalho = linhas[0];
  if (!cabecalho) {
    throw new Error('A planilha está vazia.');
  }

  const mesas = cabecalho.map((valor) => String(valor ?? '').trim());
  const resultado: LinhaImportacao[] = [];

  for (let linhaIdx = 1; linhaIdx < linhas.length; linhaIdx++) {
    const linha = linhas[linhaIdx];
    if (!linha) continue;

    for (let colunaIdx = 0; colunaIdx < mesas.length; colunaIdx++) {
      const mesa = mesas[colunaIdx];
      const celula = linha[colunaIdx];
      if (!mesa || celula === undefined || celula === null || String(celula).trim() === '') {
        continue;
      }

      const parsed = parsearCelula(String(celula));
      if (!parsed) continue;

      resultado.push({
        mesa,
        posicao: parsed.posicao,
        nome: parsed.nome,
        matricula: parsed.matricula ?? gerarMatriculaSintetica(mesa, parsed.posicao)
      });
    }
  }

  return resultado;
}

function parsearCelula(
  celula: string
): { matricula: string | null; posicao: number; nome: string } | null {
  const texto = celula.trim();

  // Formato: "00123 - 12: Maria"  (matrícula explícita)
  const comMatricula = /^(\d+)\s*-\s*(\d{1,2})\s*:\s*(.+)$/.exec(texto);
  if (comMatricula?.[1] && comMatricula[2] && comMatricula[3]) {
    return {
      matricula: comMatricula[1],
      posicao: Number.parseInt(comMatricula[2], 10),
      nome: comMatricula[3].trim()
    };
  }

  // Formato padrão: "12: Maria" ou "12 - Maria"
  const semMatricula = /^(\d{1,2})\s*[:\-]\s*(.+)$/.exec(texto);
  if (semMatricula?.[1] && semMatricula[2]) {
    return {
      matricula: null,
      posicao: Number.parseInt(semMatricula[1], 10),
      nome: semMatricula[2].trim()
    };
  }

  return null;
}

/**
 * Gera uma matrícula estável e determinística quando a planilha não traz
 * matrícula explícita, para manter a unicidade exigida pelo banco.
 * Recomenda-se sempre preferir planilhas com matrícula real.
 */
function gerarMatriculaSintetica(mesa: string, posicao: number): string {
  const mesaSlug = mesa.replace(/\D/g, '').padStart(2, '0') || '00';
  return `${mesaSlug}${String(posicao).padStart(2, '0')}`;
}

export async function importarFuncionarios(linhas: LinhaImportacao[]): Promise<ResultadoImportacao> {
  const resultado: ResultadoImportacao = { criados: 0, atualizados: 0, ignorados: [] };

  for (let i = 0; i < linhas.length; i++) {
    const linha = linhas[i];
    if (!linha) continue;

    if (linha.posicao < 1 || linha.posicao > POSICOES_POR_MESA) {
      resultado.ignorados.push({ linha: i + 2, motivo: `Posição ${linha.posicao} inválida (deve ser 1-${POSICOES_POR_MESA}).` });
      continue;
    }

    try {
      const existente = await funcionariosRepository.buscarPorMatricula(linha.matricula);
      await funcionariosRepository.cadastrarOuAtualizarPorMatricula({
        matricula: linha.matricula,
        nome: linha.nome,
        mesa: linha.mesa,
        posicao: linha.posicao
      });
      if (existente) {
        resultado.atualizados++;
      } else {
        resultado.criados++;
      }
    } catch (erro) {
      const mensagem = erro instanceof Error ? erro.message : 'Erro desconhecido.';
      resultado.ignorados.push({ linha: i + 2, motivo: mensagem });
    }
  }

  return resultado;
}
