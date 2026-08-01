/**
 * Tipos centrais do domínio do aplicativo — versão simplificada.
 *
 * O app é, na essência, um buscador de imagens com OCR: importa fotos,
 * roda o OCR UMA ÚNICA VEZ no momento da importação, guarda todas as
 * palavras reconhecidas com sua posição na imagem, e depois disso toda
 * busca acontece só sobre esses dados já salvos — nunca mais roda OCR
 * de novo na mesma imagem.
 */

/** Retângulo delimitador em coordenadas de pixel da imagem original. */
export interface BoundingBox {
  x: number;
  y: number;
  largura: number;
  altura: number;
}

export interface Imagem {
  id: string;
  /** Nome de exibição (ex.: nome do arquivo original, ou "Foto 1"). */
  nome: string;
  imagem: Blob;
  largura: number;
  altura: number;
  importadaEm: number;
  /** Sempre true depois da importação — o OCR só roda uma vez. */
  ocrProcessado: boolean;
}

export type NovaImagem = Omit<Imagem, 'id' | 'importadaEm' | 'ocrProcessado'>;

/** Uma palavra individual reconhecida pelo OCR, já persistida. */
export interface Palavra {
  id: string;
  imagemId: string;
  texto: string;
  /** Minúsculo e sem acento — usado para a busca ignorar caixa/acentuação. */
  textoNormalizado: string;
  boundingBox: BoundingBox;
  confidence: number;
}

export type NovaPalavra = Omit<Palavra, 'id'>;

/** Linha crua retornada por um motor de OCR, antes de virar Palavra persistida. */
export interface LinhaOcrBruta {
  texto: string;
  boundingBox: BoundingBox;
  confidence: number;
  /**
   * Bounding box de cada palavra individual dentro da linha, quando o
   * motor de OCR fornece essa granularidade (ML Kit e Tesseract.js
   * fornecem). É isso que vira, uma a uma, um registro em `palavras`.
   */
  palavras?: PalavraOcrBruta[];
}

export interface PalavraOcrBruta {
  texto: string;
  boundingBox: BoundingBox;
  confidence: number;
}

/** Um resultado de busca: uma palavra que bateu, já com a linha inteira calculada ao redor dela. */
export interface ResultadoBusca {
  imagemId: string;
  palavra: Palavra;
  /** Bounding box da linha inteira (palavra + vizinhas no mesmo eixo Y), para destacar no Visualizador. */
  boundingBoxLinha: BoundingBox;
  /** Texto completo da linha reconstruída, para exibir na lista de resultados. */
  textoLinha: string;
}
