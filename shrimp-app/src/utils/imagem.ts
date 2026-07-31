/** Converte um Blob em string base64 (sem o prefixo data:...;base64,). */
export async function blobParaBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const resultado = reader.result as string;
      const base64 = resultado.split(',')[1] ?? resultado;
      resolve(base64);
    };
    reader.onerror = () => reject(new Error('Falha ao ler a imagem.'));
    reader.readAsDataURL(blob);
  });
}

/** Lê as dimensões (largura/altura) de um Blob de imagem. */
export async function obterDimensoesImagem(blob: Blob): Promise<{ largura: number; altura: number }> {
  const url = URL.createObjectURL(blob);
  try {
    return await new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve({ largura: img.naturalWidth, altura: img.naturalHeight });
      img.onerror = () => reject(new Error('Falha ao carregar a imagem.'));
      img.src = url;
    });
  } finally {
    URL.revokeObjectURL(url);
  }
}

/** Converte um File (input de arquivo) em Blob puro, preservando o tipo MIME. */
export function fileParaBlob(file: File): Blob {
  return file.slice(0, file.size, file.type);
}
