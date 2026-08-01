import type { Foto, Leitura, LinhaOcrParseada, LinhaOcrBruta, OcrResultado } from '@domain/domain';
import { obterOcrService } from './ocr';
import { parsearLinhasOcr } from './ocrParser';
import { fotosRepository, funcionariosRepository, leiturasRepository } from '@database/index';

export interface PendenciaFuncionarioNovo {
  fotoId: string;
  mesa: string;
  matricula: string;
  nomeReconhecido: string | null;
  linha: LinhaOcrParseada;
}

export interface ProcessamentoDebug {
  ocrMotor: string;
  textoBruto: string | null;
  linhasBrutas: LinhaOcrBruta[];
  blocos?: OcrResultado['blocos'];
  palavras?: OcrResultado['palavras'];
  registrosParser: Array<{
    matricula: string | null;
    nome: string | null;
    percentual: number | null;
    valor: number | null;
    boundingBox: { x: number; y: number; largura: number; altura: number };
    confidence: number;
    brutaOriginal: string;
    registroValido: boolean;
    motivoDescartado: string | null;
    textoBruto: string;
  }>;
}

export interface ResultadoProcessamentoFoto {
  fotoId: string;
  leiturasRegistradas: Leitura[];
  /** Matrículas encontradas no OCR que não existem em nenhuma mesa. */
  pendencias: PendenciaFuncionarioNovo[];
  duplicadasIgnoradas: number;
  debug?: ProcessamentoDebug;
}

/**
 * Processa uma única foto: roda o OCR, interpreta as linhas, tenta
 * vincular cada matrícula a um funcionário cadastrado e grava a leitura
 * (com deduplicação). Matrículas sem cadastro viram "pendências" que a
 * tela de Processamento deve resolver via modal antes de prosseguir.
 */
export async function processarFoto(foto: Foto): Promise<ResultadoProcessamentoFoto> {
  const ocr = await obterOcrService();

  console.log('[OCR] INICIADO para foto:', {
    fotoId: foto.id,
    mesa: foto.mesa,
    tamanho: foto.imagem.size,
    tipo: foto.imagem.type || '(não informado)'
  });

  const resultadoOcr: OcrResultado =
    typeof ocr.reconhecerLinhasComDebug === 'function'
      ? await ocr.reconhecerLinhasComDebug(foto.imagem)
      : {
          linhas: await ocr.reconhecerLinhas(foto.imagem)
        };

  console.log('[OCR] RETORNOU:', {
    textoCompleto: resultadoOcr.textoBruto ?? '(vazio)',
    caracteres: resultadoOcr.textoBruto?.length ?? 0,
    linhas: resultadoOcr.linhas.length,
    blocos: resultadoOcr.blocos?.length ?? 0,
    palavras: resultadoOcr.palavras?.length ?? 0
  });
  if (!resultadoOcr.textoBruto) {
    console.log('[OCR] ATENÇÃO: texto bruto vazio');
  }

  const parseResult = parsearLinhasOcr(resultadoOcr.linhas);
  const linhasValidas = parseResult.registros;

  console.log('[PARSER] TEXTO RECEBIDO PELO PARSER:', resultadoOcr.linhas.map((linha) => linha.texto));
  console.log('[PARSER] REGISTROS GERADOS:',
    parseResult.debug.map((registro) => ({
      matricula: registro.matricula,
      nome: registro.nome,
      produtividade: registro.percentual,
      registroValido: registro.registroValido,
      motivoDescartado: registro.motivoDescartado
    }))
  );
  if (parseResult.registros.length === 0) {
    console.log('[PARSER] Nenhum registro válido encontrado. Motivos:',
      parseResult.debug.map((registro) => ({
        textoBruto: registro.textoBruto,
        motivoDescartado: registro.motivoDescartado
      }))
    );
  }

  const leiturasRegistradas: Leitura[] = [];
  const pendencias: PendenciaFuncionarioNovo[] = [];
  let duplicadasIgnoradas = 0;

  const linhasOrdenadas = [...linhasValidas].sort((a, b) => b.percentual - a.percentual);

  console.log('[SALVAMENTO] TENTANDO SALVAR:', {
    fotoId: foto.id,
    registros: linhasOrdenadas.length
  });

  for (const [indice, linha] of linhasOrdenadas.entries()) {
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

    console.log('[SALVAMENTO] RESULTADO DA FUNÇÃO registrarComDeduplicacao:', {
      fotoId: foto.id,
      matricula: linha.matricula,
      funcionarioEncontrado: funcionario ? funcionario.id : null,
      leituraRegistrada: leitura !== null,
      leituraId: leitura?.id ?? null
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

  return {
    fotoId: foto.id,
    leiturasRegistradas,
    pendencias,
    duplicadasIgnoradas,
    debug: {
      ocrMotor: ocr.nome,
      textoBruto: resultadoOcr.textoBruto ?? null,
      linhasBrutas: resultadoOcr.linhas,
      blocos: resultadoOcr.blocos,
      palavras: resultadoOcr.palavras,
      registrosParser: parseResult.debug
    }
  };
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
