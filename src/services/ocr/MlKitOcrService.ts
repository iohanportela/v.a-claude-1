import { Script, TextRecognition } from '@capacitor-mlkit/text-recognition';
import { Capacitor } from '@capacitor/core';
import { Filesystem, Directory } from '@capacitor/filesystem';
import type { OcrService } from './OcrService';
import type { LinhaOcrBruta, BoundingBox, PalavraOcrBruta } from '@domain/domain';
import { blobParaBase64 } from '@utils/imagem';

/**
 * Motor de OCR nativo, usado apenas quando o app roda empacotado como
 * APK Android via Capacitor. Requer o plugin @capacitor-mlkit/text-recognition
 * (v8.x, compatível com Capacitor 8) instalado e sincronizado
 * (`npx cap sync android`). Não funciona em navegador comum — use
 * TesseractOcrService nesse caso.
 *
 * IMPORTANTE (correção pós-upgrade para Capacitor 8 / plugin 8.2.0):
 * plugins da família @capacitor-mlkit recebem a imagem como um `path`
 * (caminho de arquivo ou file:// URI), NÃO como string base64 solta.
 * A implementação anterior passava base64 direto em `path`, o que nunca
 * funcionaria de fato no dispositivo. Agora a imagem é primeiro escrita
 * num arquivo temporário via @capacitor/filesystem, e o caminho retornado
 * é o que vai para o plugin.
 */
export class MlKitOcrService implements OcrService {
  readonly nome = 'Google ML Kit (nativo)';

  async estaDisponivel(): Promise<boolean> {
    return Capacitor.isNativePlatform() && Capacitor.getPlatform() === 'android';
  }

  private async garantirPermissoes(): Promise<void> {
    // O plugin de text-recognition em si não acessa a câmera/galeria —
    // só processa um arquivo já existente — mas o Filesystem plugin
    // precisa de permissão de armazenamento em alguns Android antigos.
    // checkPermissions/requestPermissions seguem disponíveis na v8.
    try {
      const status = await Filesystem.checkPermissions();
      if (status.publicStorage !== 'granted') {
        await Filesystem.requestPermissions();
      }
    } catch {
      // Em Android 10+ com escopo de armazenamento por app, o Filesystem
      // plugin pode nem expor essa permissão — seguimos sem bloquear,
      // já que gravamos em Directory.Cache, que não exige permissão.
    }
  }

  async reconhecerLinhas(imagem: Blob): Promise<LinhaOcrBruta[]> {
    await this.garantirPermissoes();

    const caminhoArquivo = await this.escreverArquivoTemporario(imagem);

    try {
      const resultado = await TextRecognition.processImage({
        path: caminhoArquivo,
        script: Script.Latin
      });

      const linhas: LinhaOcrBruta[] = [];

      for (const bloco of resultado.blocks ?? []) {
        for (const linha of bloco.lines ?? []) {
          const bbox = converterBoundingBox(linha.cornerPoints ?? linha.boundingBox);
          if (!bbox) continue;

          const palavras: PalavraOcrBruta[] = [];
          for (const elemento of linha.elements ?? []) {
            const bboxPalavra = converterBoundingBox(elemento.cornerPoints ?? elemento.boundingBox);
            if (!bboxPalavra) continue;
            palavras.push({
              texto: elemento.text,
              boundingBox: bboxPalavra,
              confidence: 0.85
            });
          }

          linhas.push({
            texto: linha.text,
            boundingBox: bbox,
            // ML Kit não expõe confidence na tipagem do plugin; usamos
            // 0.85 como estimativa conservadora por padrão.
            confidence: 0.85,
            ...(palavras.length > 0 ? { palavras } : {})
          });
        }
      }

      return linhas;
    } finally {
      await this.removerArquivoTemporario(caminhoArquivo);
    }
  }

  private async escreverArquivoTemporario(imagem: Blob): Promise<string> {
    const base64 = await blobParaBase64(imagem);
    const nomeArquivo = `ocr-tmp-${Date.now()}-${Math.random().toString(36).slice(2, 8)}.jpg`;

    const resultado = await Filesystem.writeFile({
      path: nomeArquivo,
      data: base64,
      directory: Directory.Cache
    });

    return resultado.uri;
  }

  private async removerArquivoTemporario(uri: string): Promise<void> {
    try {
      await Filesystem.deleteFile({ path: uri });
    } catch {
      // Falha ao limpar arquivo temporário não deve interromper o fluxo do app.
    }
  }
}

interface Ponto {
  x: number;
  y: number;
}

interface Rect {
  left: number;
  top: number;
  right: number;
  bottom: number;
}

function converterBoundingBox(value: Ponto[] | Rect | undefined): BoundingBox | null {
  if (!value) return null;

  if (Array.isArray(value)) {
    if (value.length === 0) return null;

    const xs = value.map((p) => p.x);
    const ys = value.map((p) => p.y);
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

  return {
    x: value.left,
    y: value.top,
    largura: value.right - value.left,
    altura: value.bottom - value.top
  };
}
