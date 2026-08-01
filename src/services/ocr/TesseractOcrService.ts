import { createWorker, type Worker, PSM } from 'tesseract.js';
import type { OcrService } from './OcrService';
import type { LinhaOcrBruta, BoundingBox, OcrResultado } from '@domain/domain';

/**
 * Motor de OCR 100% client-side baseado em Tesseract.js (WebAssembly).
 * Funciona em qualquer navegador ou WebView, incluindo o modo PWA sem
 * plugins nativos. Usado como fallback quando o ML Kit nativo não está
 * disponível (ex.: durante desenvolvimento no navegador).
 */
export class TesseractOcrService implements OcrService {
  readonly nome = 'Tesseract.js (fallback web)';
  private workerPromise: Promise<Worker> | null = null;

  async estaDisponivel(): Promise<boolean> {
    return true;
  }

  private async obterWorker(): Promise<Worker> {
    if (!this.workerPromise) {
      this.workerPromise = createWorker('por', 1, {
        logger: () => {
          /* silencioso em produção */
        }
      }).then(async (worker) => {
        await worker.setParameters({
          tessedit_pageseg_mode: PSM.SPARSE_TEXT
        });
        return worker;
      });
    }
    return this.workerPromise;
  }

  async reconhecerLinhas(imagem: Blob): Promise<LinhaOcrBruta[]> {
    return (await this.reconhecerLinhasComDebug(imagem)).linhas;
  }

  async reconhecerLinhasComDebug(imagem: Blob): Promise<OcrResultado> {
    const worker = await this.obterWorker();
    const url = URL.createObjectURL(imagem);

    try {
      const { data } = await worker.recognize(url, {}, { blocks: true });
      const linhas: LinhaOcrBruta[] = [];
      const blocos = data.blocks?.map((bloco) => ({
        texto: bloco.text?.trim() ?? '',
        boundingBox: converterBoundingBox(bloco.bbox),
        confidence: bloco.confidence / 100
      })) ?? [];
      const palavras: OcrResultado['palavras'] = [];

      for (const bloco of data.blocks ?? []) {
        for (const paragrafo of bloco.paragraphs ?? []) {
          for (const linha of paragrafo.lines ?? []) {
            const bbox = converterBoundingBox(linha.bbox);
            const texto = linha.text.trim();
            linhas.push({
              texto,
              boundingBox: bbox,
              confidence: linha.confidence / 100
            });

            for (const palavra of linha.words ?? []) {
              const palavraTexto = palavra.text.trim();
              if (!palavraTexto) continue;
              palavras.push({
                texto: palavraTexto,
                boundingBox: converterBoundingBox(palavra.bbox),
                confidence: palavra.confidence / 100
              });
            }
          }
        }
      }

      return {
        textoBruto: data.text?.trim() ?? '',
        linhas: linhas.filter((l) => l.texto.length > 0),
        blocos,
        palavras
      };
    } finally {
      URL.revokeObjectURL(url);
    }
  }

  async encerrar(): Promise<void> {
    if (this.workerPromise) {
      const worker = await this.workerPromise;
      await worker.terminate();
      this.workerPromise = null;
    }
  }
}

function converterBoundingBox(bbox: { x0: number; y0: number; x1: number; y1: number }): BoundingBox {
  return {
    x: bbox.x0,
    y: bbox.y0,
    largura: bbox.x1 - bbox.x0,
    altura: bbox.y1 - bbox.y0
  };
}
