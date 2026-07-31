import type { OcrService } from './OcrService';
import { MlKitOcrService } from './MlKitOcrService';
import { TesseractOcrService } from './TesseractOcrService';

let instanciaAtual: OcrService | null = null;

/**
 * Escolhe e memoiza o melhor motor de OCR disponível no ambiente atual:
 * ML Kit nativo quando rodando como APK Android, Tesseract.js em
 * qualquer outro caso (navegador, PWA, desenvolvimento).
 */
export async function obterOcrService(): Promise<OcrService> {
  if (instanciaAtual) return instanciaAtual;

  const mlKit = new MlKitOcrService();
  if (await mlKit.estaDisponivel()) {
    instanciaAtual = mlKit;
    return instanciaAtual;
  }

  instanciaAtual = new TesseractOcrService();
  return instanciaAtual;
}

export type { OcrService } from './OcrService';
