import type { NovaImagem } from '@domain/domain';
import { obterOcrService } from './ocr';
import { imagensRepository, palavrasRepository } from '@database/index';

export interface ResultadoImportacaoImagem {
  imagemId: string;
  totalPalavras: number;
}

/**
 * Importa uma imagem: salva o arquivo, roda o OCR UMA ÚNICA VEZ sobre
 * ele e grava todas as palavras reconhecidas com sua bounding box.
 * Depois desta chamada, o OCR nunca mais é executado para esta imagem —
 * toda busca futura lê apenas os registros já salvos em `palavras`.
 */
export async function importarImagem(dados: NovaImagem): Promise<ResultadoImportacaoImagem> {
  const imagem = await imagensRepository.criar(dados);

  const ocr = await obterOcrService();
  const linhas = await ocr.reconhecerLinhas(imagem.imagem);

  const palavras = linhas.flatMap((linha) => {
    if (linha.palavras && linha.palavras.length > 0) {
      return linha.palavras.map((p) => ({
        texto: p.texto,
        boundingBox: p.boundingBox,
        confidence: p.confidence
      }));
    }

    // Quando o motor de OCR não fornece granularidade de palavra, guarda
    // a linha inteira como um único registro — melhor do que perder o
    // texto, mesmo que o destaque fique um pouco menos preciso nesse caso.
    if (linha.texto.trim().length === 0) return [];
    return [{ texto: linha.texto.trim(), boundingBox: linha.boundingBox, confidence: linha.confidence }];
  });

  if (palavras.length > 0) {
    await palavrasRepository.registrarLote(imagem.id, palavras);
  }

  await imagensRepository.marcarOcrProcessado(imagem.id);

  return { imagemId: imagem.id, totalPalavras: palavras.length };
}

/** Importa múltiplas imagens em sequência (ex.: seleção múltipla da galeria). */
export async function importarImagens(itens: NovaImagem[]): Promise<ResultadoImportacaoImagem[]> {
  const resultados: ResultadoImportacaoImagem[] = [];
  for (const dados of itens) {
    resultados.push(await importarImagem(dados));
  }
  return resultados;
}
