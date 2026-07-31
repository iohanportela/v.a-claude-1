import type { Foto, Leitura, LinhaOcrParseada } from '@types/domain';
import { obterOcrService } from './ocr';
import { parsearLinhasValidas } from './ocrParser';
import { fotosRepository, funcionariosRepository, leiturasRepository } from '@database/index';

export interface PendenciaFuncionarioNovo {
  fotoId: string;
  mesa: string;
  matricula: string;
  nomeReconhecido: string | null;
  linha: LinhaOcrParseada;
}

export interface ResultadoProcessamentoFoto {
  fotoId: string;
  leiturasRegistradas: Leitura[];
  /** Matrículas encontradas no OCR que não existem em nenhuma mesa. */
  pendencias: PendenciaFuncionarioNovo[];
  duplicadasIgnoradas: number;
}

/**
 * Processa uma única foto: roda o OCR, interpreta as linhas, tenta
 * vincular cada matrícula a um funcionário cadastrado e grava a leitura
 * (com deduplicação). Matrículas sem cadastro viram "pendências" que a
 * tela de Processamento deve resolver via modal antes de prosseguir.
 */
export async function processarFoto(foto: Foto): Promise<ResultadoProcessamentoFoto> {
  const ocr = await obterOcrService();
  const linhasBrutas = await ocr.reconhecerLinhas(foto.imagem);
  const linhasValidas = parsearLinhasValidas(linhasBrutas);

  const leiturasRegistradas: Leitura[] = [];
  const pendencias: PendenciaFuncionarioNovo[] = [];
  let duplicadasIgnoradas = 0;

  const linhasOrdenadas = [...linhasValidas].sort((a, b) => b.percentual - a.percentual);

  for (let indice = 0; indice < linhasOrdenadas.length; indice++) {
    const linha = linhasOrdenadas[indice];
    if (!linha) continue;

    const funcionario = await funcionariosRepository.buscarPorMatricula(linha.matricula);

    const leitura = await leiturasRepository.registrarComDeduplicacao({
      fotoId: foto.id,
      mesa: foto.mesa,
      matricula: linha.matricula,
      nomeReconhecido: linha.nome ?? '',
      percentual: linha.percentual,
      valor: linha.valor,
      boundingBox: linha.boundingBox,
      confidence: linha.confidence,
      funcionarioId: funcionario?.id ?? null,
      ordem: indice + 1
    });

    if (leitura === null) {
      duplicadasIgnoradas++;
      continue;
    }

    leiturasRegistradas.push(leitura);

    if (!funcionario) {
      pendencias.push({
        fotoId: foto.id,
        mesa: foto.mesa,
        matricula: linha.matricula,
        nomeReconhecido: linha.nome,
        linha
      });
    }
  }

  await fotosRepository.marcarProcessada(foto.id);

  return { fotoId: foto.id, leiturasRegistradas, pendencias, duplicadasIgnoradas };
}

/**
 * Vincula uma pendência recém-cadastrada (funcionário criado a partir do
 * modal) à leitura correspondente, permitindo que o processamento
 * continue automaticamente para a próxima pendência.
 */
export async function resolverPendencia(
  pendencia: PendenciaFuncionarioNovo,
  funcionarioId: string
): Promise<void> {
  const leitura = await leiturasRepository.buscarPorMatricula(pendencia.matricula);
  if (leitura) {
    await leiturasRepository.vincularFuncionario(leitura.id, funcionarioId);
  }
}

/** Processa múltiplas fotos em sequência, acumulando pendências de todas. */
export async function processarFotos(fotos: Foto[]): Promise<ResultadoProcessamentoFoto[]> {
  const resultados: ResultadoProcessamentoFoto[] = [];
  for (const foto of fotos) {
    resultados.push(await processarFoto(foto));
  }
  return resultados;
}
