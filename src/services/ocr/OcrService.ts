import type { LinhaOcrBruta, OcrResultado } from '@domain/domain';

/**
 * Contrato que qualquer motor de OCR deve implementar. O restante do
 * app (services/processamento, hooks, telas) depende apenas desta
 * interface — nunca de Tesseract ou ML Kit diretamente. Isso permite
 * trocar o motor por plataforma sem alterar a lógica de negócio.
 */
export interface OcrService {
  /** Nome do motor, usado em logs e na tela de Configurações. */
  readonly nome: string;

  /** Indica se este motor está disponível no ambiente atual. */
  estaDisponivel(): Promise<boolean>;

  /**
   * Executa o reconhecimento de texto sobre uma imagem e retorna as
   * linhas detectadas com bounding box e confiança, sem qualquer
   * interpretação de domínio (isso é responsabilidade do parser).
   */
  reconhecerLinhas(imagem: Blob): Promise<LinhaOcrBruta[]>;

  reconhecerLinhasComDebug?(imagem: Blob): Promise<OcrResultado>;
}
