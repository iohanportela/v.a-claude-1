import { Script, TextRecognition } from '@capacitor-mlkit/text-recognition';
import { Capacitor } from '@capacitor/core';
import type { OcrService } from './OcrService';
import type { LinhaOcrBruta, BoundingBox, OcrResultado } from '@domain/domain';
import { blobParaBase64 } from '@utils/imagem';

/**
 * Motor de OCR nativo, usado apenas quando o app roda empacotado como
 * APK Android via Capacitor. Requer o plugin @capacitor-mlkit/text-recognition
 * instalado e sincronizado (`npx cap sync android`). Não funciona em
 * navegador comum — use TesseractOcrService nesse caso.
 */
export class MlKitOcrService implements OcrService {
  readonly nome = 'Google ML Kit (nativo)';

  async estaDisponivel(): Promise<boolean> {
    return Capacitor.isNativePlatform() && Capacitor.getPlatform() === 'android';
  }

  async reconhecerLinhas(imagem: Blob): Promise<LinhaOcrBruta[]> {
    return (await this.reconhecerLinhasComDebug(imagem)).linhas;
  }

  async reconhecerLinhasComDebug(imagem: Blob): Promise<OcrResultado> {
    const base64 = await blobParaBase64(imagem);

    const resultado = await TextRecognition.processImage({
      path: base64,
      script: Script.Latin
    });

    const linhas: LinhaOcrBruta[] = [];
    const blocos = (resultado.blocks ?? [])
      .map((bloco) => {
        const bbox = converterBoundingBox(bloco.cornerPoints);
        if (!bbox) return null;
        return {
          texto: bloco.text ?? '',
          boundingBox: bbox,
          confidence: 0.85
        };
      })
      .filter((item): item is { texto: string; boundingBox: BoundingBox; confidence: number } => item !== null);
    const palavras: OcrResultado['palavras'] = [];

    for (const bloco of resultado.blocks ?? []) {
      for (const linha of bloco.lines ?? []) {
        const bbox = converterBoundingBox(linha.cornerPoints);
        if (!bbox) continue;

        const texto = linha.text ?? '';
        linhas.push({
          texto,
          boundingBox: bbox,
          confidence: 0.85
        });

        for (const elemento of linha.elements ?? []) {
          if (!elemento.text) continue;
          const palavraBbox = converterBoundingBox(elemento.cornerPoints);
          if (!palavraBbox) continue;
          palavras.push({
            texto: elemento.text,
            boundingBox: palavraBbox,
            confidence: 0.85
          });
        }
      }
    }

    return {
      textoBruto: resultado.text ?? '',
      linhas,
      blocos,
      palavras
    };
  }
}

interface Ponto {
  x: number;
  y: number;
}

function converterBoundingBox(cornerPoints: Ponto[] | undefined): BoundingBox | null {
  if (!cornerPoints || cornerPoints.length === 0) return null;

  const xs = cornerPoints.map((p) => p.x);
  const ys = cornerPoints.map((p) => p.y);
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const minY = Math.min(...ys);
  const maxY = Math.max(...ys);

  return {
    x: minX,
    y: minY,
    largura: maxX - minX,
    altura: maxY - minY
  };
}
