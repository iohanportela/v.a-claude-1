import { TextRecognition } from '@capacitor-mlkit/text-recognition';
import { Capacitor } from '@capacitor/core';
import type { OcrService } from './OcrService';
import type { LinhaOcrBruta, BoundingBox } from '@types/domain';
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
    const base64 = await blobParaBase64(imagem);

    const resultado = await TextRecognition.recognize({
      path: base64,
      options: { language: 'latin' }
    });

    const linhas: LinhaOcrBruta[] = [];

    for (const bloco of resultado.blocks ?? []) {
      for (const linha of bloco.lines ?? []) {
        const bbox = converterBoundingBox(linha.cornerPoints);
        if (!bbox) continue;

        linhas.push({
          texto: linha.text,
          boundingBox: bbox,
          // ML Kit não retorna confidence por linha na maioria das versões;
          // usamos 0.85 como estimativa conservadora quando ausente.
          confidence: typeof linha.confidence === 'number' ? linha.confidence : 0.85
        });
      }
    }

    return linhas;
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
