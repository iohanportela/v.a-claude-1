import { useEffect, useState } from 'react';
import { imagensRepository } from '@database/index';
import type { Imagem } from '@domain/domain';

interface MiniaturaImagemProps {
  imagem: Imagem;
  className?: string;
}

export function MiniaturaImagem({ imagem, className }: MiniaturaImagemProps): JSX.Element {
  const [url, setUrl] = useState<string | null>(null);

  useEffect(() => {
    const objectUrl = imagensRepository.criarUrlObjeto(imagem);
    setUrl(objectUrl);
    return () => URL.revokeObjectURL(objectUrl);
  }, [imagem]);

  if (!url) {
    return <div className={className ?? 'h-24 w-24 rounded-lg bg-base-800'} />;
  }

  return <img src={url} alt={imagem.nome} className={className ?? 'h-24 w-24 rounded-lg object-cover'} />;
}
