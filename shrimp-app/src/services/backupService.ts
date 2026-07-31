import { db } from '@database/db';
import type { Funcionario, Foto, Leitura } from '@types/domain';

interface BackupArquivo {
  versao: 1;
  exportadoEm: number;
  funcionarios: Funcionario[];
  fotos: Array<Omit<Foto, 'imagem'> & { imagemBase64: string; imagemTipo: string }>;
  leituras: Leitura[];
}

async function blobParaDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result as string);
    reader.onerror = () => reject(new Error('Falha ao converter imagem para backup.'));
    reader.readAsDataURL(blob);
  });
}

function dataUrlParaBlob(dataUrl: string, tipo: string): Blob {
  const base64 = dataUrl.includes(',') ? dataUrl.split(',')[1] ?? dataUrl : dataUrl;
  const binario = atob(base64);
  const bytes = new Uint8Array(binario.length);
  for (let i = 0; i < binario.length; i++) {
    bytes[i] = binario.charCodeAt(i);
  }
  return new Blob([bytes], { type: tipo });
}

/** Gera um Blob JSON com todo o conteúdo do banco, pronto para download. */
export async function exportarBanco(): Promise<Blob> {
  const [funcionarios, fotos, leituras] = await Promise.all([
    db.funcionarios.toArray(),
    db.fotos.toArray(),
    db.leituras.toArray()
  ]);

  const fotosSerializadas = await Promise.all(
    fotos.map(async (foto) => {
      const dataUrl = await blobParaDataUrl(foto.imagem);
      const { imagem, ...resto } = foto;
      return { ...resto, imagemBase64: dataUrl, imagemTipo: imagem.type };
    })
  );

  const backup: BackupArquivo = {
    versao: 1,
    exportadoEm: Date.now(),
    funcionarios,
    fotos: fotosSerializadas,
    leituras
  };

  return new Blob([JSON.stringify(backup)], { type: 'application/json' });
}

export function nomeArquivoBackup(): string {
  const agora = new Date();
  const carimbo = agora.toISOString().replace(/[:.]/g, '-').slice(0, 19);
  return `backup-produtividade-${carimbo}.json`;
}

/** Substitui todo o conteúdo do banco pelo conteúdo do arquivo de backup. */
export async function importarBanco(arquivo: File): Promise<void> {
  const texto = await arquivo.text();
  const backup = JSON.parse(texto) as BackupArquivo;

  if (backup.versao !== 1) {
    throw new Error('Versão de backup não suportada.');
  }

  const fotosReconstruidas: Foto[] = backup.fotos.map((f) => ({
    id: f.id,
    mesa: f.mesa,
    imagem: dataUrlParaBlob(f.imagemBase64, f.imagemTipo),
    largura: f.largura,
    altura: f.altura,
    capturadaEm: f.capturadaEm,
    processada: f.processada
  }));

  await db.transaction('rw', db.funcionarios, db.fotos, db.leituras, async () => {
    await db.funcionarios.clear();
    await db.fotos.clear();
    await db.leituras.clear();

    await db.funcionarios.bulkAdd(backup.funcionarios);
    await db.fotos.bulkAdd(fotosReconstruidas);
    await db.leituras.bulkAdd(backup.leituras);
  });
}

/** Apaga permanentemente todos os dados do aplicativo. */
export async function limparBanco(): Promise<void> {
  await db.transaction('rw', db.funcionarios, db.fotos, db.leituras, async () => {
    await db.funcionarios.clear();
    await db.fotos.clear();
    await db.leituras.clear();
  });
}
