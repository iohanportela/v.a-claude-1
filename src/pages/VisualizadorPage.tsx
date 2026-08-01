import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { useImagem } from '@hooks/useImagens';
import { imagensRepository, palavrasRepository } from '@database/index';
import { VisualizadorZoom } from '@components/imagem/VisualizadorZoom';
import { encontrarLinhaCompleta } from '@utils/agrupamentoLinha';
import { normalizarTexto } from '@utils/texto';

export function VisualizadorPage(): JSX.Element {
  const { id } = useParams<{ id: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const imagem = useImagem(id ?? null);
  const palavras = useLiveQuery(() => (id ? palavrasRepository.listarPorImagem(id) : []), [id], []) ?? [];

  const palavraIdInicial = searchParams.get('palavra');
  const [termoLocal, setTermoLocal] = useState('');
  const [url, setUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!imagem) return;
    const objectUrl = imagensRepository.criarUrlObjeto(imagem);
    setUrl(objectUrl);
    return () => URL.revokeObjectURL(objectUrl);
  }, [imagem]);

  const destaque = useMemo(() => {
    if (palavras.length === 0) return null;

    // Prioridade 1: veio de um resultado de busca específico (link da Pesquisa).
    if (palavraIdInicial) {
      const alvo = palavras.find((p) => p.id === palavraIdInicial);
      if (alvo) return encontrarLinhaCompleta(alvo, palavras).boundingBox;
    }

    // Prioridade 2: busca local digitada dentro do próprio visualizador.
    const termoNormalizado = normalizarTexto(termoLocal);
    if (termoNormalizado) {
      const alvo = palavras.find((p) => p.textoNormalizado.includes(termoNormalizado));
      if (alvo) return encontrarLinhaCompleta(alvo, palavras).boundingBox;
    }

    return null;
  }, [palavras, palavraIdInicial, termoLocal]);

  if (!imagem || !url) {
    return (
      <div className="flex h-full items-center justify-center">
        <p className="text-base-500">Carregando imagem...</p>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col">
      <div className="flex-1">
        <VisualizadorZoom src={url} largura={imagem.largura} altura={imagem.altura} destaque={destaque} />
      </div>

      <div className="border-t border-base-800 bg-base-900 px-4 py-3">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => navigate('/')}
            className="shrink-0 rounded-full bg-base-800 p-2.5 text-base-200"
            aria-label="Voltar"
          >
            <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={2}>
              <path d="M15 6 9 12l6 6" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
          <input
            className="campo-input"
            placeholder="Pesquisar nesta imagem..."
            value={termoLocal}
            onChange={(e) => setTermoLocal(e.target.value)}
          />
        </div>
        <p className="mt-2 text-center text-xs text-base-500">
          Arraste para mover · pinça ou roda do mouse para dar zoom · toque duas vezes para ajustar
        </p>
      </div>
    </div>
  );
}
