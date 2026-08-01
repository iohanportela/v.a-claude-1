import type { ResultadoBusca } from '@domain/domain';
import { palavrasRepository } from '@database/index';
import { encontrarLinhaCompleta } from '@utils/agrupamentoLinha';

/**
 * Pesquisa um termo entre todas as palavras já salvas (nenhum OCR roda
 * aqui). Para cada palavra encontrada, já calcula a bounding box da
 * linha inteira ao redor dela (agrupando palavras vizinhas no eixo Y),
 * pronta para o Visualizador destacar.
 */
export async function pesquisar(termo: string): Promise<ResultadoBusca[]> {
  const encontradas = await palavrasRepository.pesquisar(termo);
  if (encontradas.length === 0) return [];

  // Agrupa por imagem para não buscar a lista de palavras da mesma
  // imagem repetidas vezes.
  const palavrasPorImagem = new Map<string, Awaited<ReturnType<typeof palavrasRepository.listarPorImagem>>>();

  const resultados: ResultadoBusca[] = [];

  for (const palavra of encontradas) {
    let todasDaImagem = palavrasPorImagem.get(palavra.imagemId);
    if (!todasDaImagem) {
      todasDaImagem = await palavrasRepository.listarPorImagem(palavra.imagemId);
      palavrasPorImagem.set(palavra.imagemId, todasDaImagem);
    }

    const linha = encontrarLinhaCompleta(palavra, todasDaImagem);

    resultados.push({
      imagemId: palavra.imagemId,
      palavra,
      boundingBoxLinha: linha.boundingBox,
      textoLinha: linha.texto
    });
  }

  return resultados;
}
