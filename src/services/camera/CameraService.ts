import { Camera, type MediaResult } from '@capacitor/camera';
import { Filesystem } from '@capacitor/filesystem';
import { Capacitor } from '@capacitor/core';

/**
 * Serviço de captura/seleção de fotos. Usa a API nova do @capacitor/camera
 * (v8.1+): `takePhoto` e `chooseFromGallery` substituem o antigo `getPhoto`
 * — que ficou depreciado e não deve mais ser chamado. Essa API já
 * funciona tanto no APK Android nativo (com permissões reais de
 * câmera/galeria) quanto no navegador/PWA (cai automaticamente para um
 * `<input type="file">` quando não há elementos de câmera PWA
 * registrados) — não é necessário nenhum branch manual de plataforma.
 */
export const cameraService = {
  /**
   * Garante permissão de câmera e galeria antes de abrir qualquer fluxo
   * de captura. Em Web, checkPermissions/requestPermissions são no-ops
   * seguros (a API do plugin sempre resolve 'granted' no navegador).
   */
  async garantirPermissoes(): Promise<void> {
    const status = await Camera.checkPermissions();
    if (status.camera !== 'granted' || status.photos !== 'granted') {
      const solicitado = await Camera.requestPermissions({ permissions: ['camera', 'photos'] });
      if (solicitado.camera === 'denied' && solicitado.photos === 'denied') {
        throw new Error(
          'Permissão de câmera/galeria negada. Habilite o acesso nas configurações do aplicativo.'
        );
      }
    }
  },

  /** Abre a câmera do dispositivo e retorna a foto tirada como Blob. */
  async tirarFoto(): Promise<Blob> {
    await this.garantirPermissoes();

    const resultado = await Camera.takePhoto({
      quality: 90,
      includeMetadata: true,
      correctOrientation: true
    });

    return this.converterParaBlob(resultado);
  },

  /**
   * Abre a galeria/arquivos do dispositivo para escolher uma ou mais
   * fotos já existentes (ex.: prints da tela do sistema salvos
   * anteriormente). Cobre o caso de "enviar" uma foto, não só tirá-la.
   */
  async escolherDaGaleria(multiplas: boolean): Promise<Blob[]> {
    await this.garantirPermissoes();

    const { results } = await Camera.chooseFromGallery({
      allowMultipleSelection: multiplas,
      includeMetadata: true,
      quality: 90
    });

    const blobs: Blob[] = [];
    for (const item of results) {
      blobs.push(await this.converterParaBlob(item));
    }
    return blobs;
  },

  /**
   * Converte o resultado do plugin (MediaResult) em um Blob local.
   * No nativo, `thumbnail` costuma vir em resolução reduzida — para a
   * qualidade completa (necessária para o OCR ler percentuais pequenos),
   * lemos o arquivo original via Filesystem a partir de `uri`. Na Web,
   * `webPath` já é utilizável diretamente via fetch.
   */
  async converterParaBlob(resultado: MediaResult): Promise<Blob> {
    if (!Capacitor.isNativePlatform()) {
      const url = resultado.webPath ?? (resultado.thumbnail ? `data:image/jpeg;base64,${resultado.thumbnail}` : undefined);
      if (!url) {
        throw new Error('Não foi possível obter a imagem no navegador.');
      }
      const resposta = await fetch(url);
      return resposta.blob();
    }

    if (!resultado.uri) {
      throw new Error('Não foi possível obter o caminho da imagem no dispositivo.');
    }

    const arquivo = await Filesystem.readFile({ path: resultado.uri });
    const mime = mimeDoFormato(resultado.metadata?.format);
    return base64ParaBlob(arquivo.data as string, mime);
  }
};

function mimeDoFormato(formato: string | undefined): string {
  const normalizado = (formato ?? 'jpeg').toLowerCase();
  if (normalizado === 'png') return 'image/png';
  return 'image/jpeg';
}

function base64ParaBlob(base64: string, mime: string): Blob {
  const binario = atob(base64);
  const bytes = new Uint8Array(binario.length);
  for (let i = 0; i < binario.length; i++) {
    bytes[i] = binario.charCodeAt(i);
  }
  return new Blob([bytes], { type: mime });
}
