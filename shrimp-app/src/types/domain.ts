/**
 * Tipos centrais do domínio do aplicativo de produtividade.
 * Toda a aplicação depende destes contratos — mudanças aqui se propagam
 * para database, services, hooks e components.
 */

/** Cada mesa possui exatamente 24 posições fixas. */
export const POSICOES_POR_MESA = 24 as const;

/** Disposição visual fixa da mesa: fileira superior 12→1, fileira inferior 13→24. */
export const LAYOUT_MESA: readonly number[][] = [
  [12, 11, 10, 9, 8, 7, 6, 5, 4, 3, 2, 1],
  [13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24]
] as const;

export interface Funcionario {
  /** UUID interno, chave primária. */
  id: string;
  /** Identificador único do sistema da empresa. Índice único no banco. */
  matricula: string;
  nome: string;
  /** Identificador/nome da mesa (ex.: "Mesa 1", "Mesa 2"). */
  mesa: string;
  /** Posição fixa de 1 a 24 dentro da mesa. */
  posicao: number;
  criadoEm: number;
  atualizadoEm: number;
}

export type NovoFuncionario = Omit<Funcionario, 'id' | 'criadoEm' | 'atualizadoEm'>;

/** Uma foto da tela do sistema da empresa, referente a uma mesa. */
export interface Foto {
  id: string;
  mesa: string;
  /** Imagem armazenada como Blob local (IndexedDB suporta Blob nativamente). */
  imagem: Blob;
  largura: number;
  altura: number;
  capturadaEm: number;
  /** Se o OCR desta foto já foi processado. */
  processada: boolean;
}

export type NovaFoto = Omit<Foto, 'id' | 'capturadaEm' | 'processada'>;

/** Retângulo delimitador em coordenadas de pixel da foto original. */
export interface BoundingBox {
  x: number;
  y: number;
  largura: number;
  altura: number;
}

/**
 * Uma linha reconhecida pelo OCR em uma foto, antes ou depois de
 * ser vinculada a um Funcionario cadastrado.
 */
export interface Leitura {
  id: string;
  fotoId: string;
  mesa: string;
  matricula: string;
  nomeReconhecido: string;
  percentual: number;
  valor: number | null;
  boundingBox: BoundingBox;
  /** Confiança média do OCR para esta linha, de 0 a 1. */
  confidence: number;
  /** Preenchido após a leitura ser vinculada a um funcionário cadastrado. */
  funcionarioId: string | null;
  /** Posição de ranking dentro da foto (1 = maior produtividade). */
  ordem: number;
  criadaEm: number;
}

export type NovaLeitura = Omit<Leitura, 'id' | 'criadaEm'>;

/** Linha crua retornada por um motor de OCR, antes do parsing de domínio. */
export interface LinhaOcrBruta {
  texto: string;
  boundingBox: BoundingBox;
  confidence: number;
}

/** Resultado do parser que extrai matrícula/nome/percentual/valor de uma LinhaOcrBruta. */
export interface LinhaOcrParseada {
  matricula: string | null;
  nome: string | null;
  percentual: number | null;
  valor: number | null;
  boundingBox: BoundingBox;
  confidence: number;
  brutaOriginal: string;
}

export interface MapaMesaPosicao {
  posicao: number;
  ocupada: boolean;
  funcionario: Funcionario | null;
}

export interface EstadoNavegacao {
  leituraAtualId: string | null;
  indiceAtual: number;
  totalLeituras: number;
}
