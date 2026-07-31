import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useNavegacaoStore } from '@hooks/useNavegacaoStore';
import { useFuncionario, useMesas } from '@hooks/useFuncionarios';
import { fotosRepository, leiturasRepository } from '@database/index';

export function NavegacaoPage(): JSX.Element {
  const navigate = useNavigate();
  const mesas = useMesas();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imagemRef = useRef<HTMLImageElement | null>(null);
  const urlAtualRef = useRef<string | null>(null);

  const lista = useNavegacaoStore((e) => e.lista);
  const indiceAtual = useNavegacaoStore((e) => e.indiceAtual);
  const definirLista = useNavegacaoStore((e) => e.definirLista);
  const proximo = useNavegacaoStore((e) => e.proximo);
  const anterior = useNavegacaoStore((e) => e.anterior);

  const leituraAtual = lista[indiceAtual] ?? null;
  const funcionario = useFuncionario(leituraAtual?.funcionarioId ?? null);

  const [fotoIdCarregada, setFotoIdCarregada] = useState<string | null>(null);
  const [carregando, setCarregando] = useState(false);

  // Carrega a foto correspondente sempre que a leitura atual aponta para
  // uma foto diferente da que já está em memória — a troca é automática
  // e transparente: o usuário só percebe o destaque mudando de lugar.
  useEffect(() => {
    if (!leituraAtual || leituraAtual.fotoId === fotoIdCarregada) {
      if (leituraAtual) desenhar(leituraAtual);
      return;
    }

    let cancelado = false;
    setCarregando(true);

    (async () => {
      const foto = await fotosRepository.buscarPorId(leituraAtual.fotoId);
      if (!foto || cancelado) return;

      if (urlAtualRef.current) URL.revokeObjectURL(urlAtualRef.current);
      const url = fotosRepository.criarUrlObjeto(foto);
      urlAtualRef.current = url;

      const img = new Image();
      img.onload = () => {
        if (cancelado) return;
        imagemRef.current = img;
        setFotoIdCarregada(foto.id);
        setCarregando(false);
        desenhar(leituraAtual);
      };
      img.src = url;
    })();

    return () => {
      cancelado = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [leituraAtual?.fotoId]);

  // Redesenha o destaque sempre que o índice muda dentro da mesma foto.
  useEffect(() => {
    if (leituraAtual && leituraAtual.fotoId === fotoIdCarregada) {
      desenhar(leituraAtual);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [indiceAtual, fotoIdCarregada]);

  useEffect(() => {
    return () => {
      if (urlAtualRef.current) URL.revokeObjectURL(urlAtualRef.current);
    };
  }, []);

  function desenhar(leitura: NonNullable<typeof leituraAtual>): void {
    const canvas = canvasRef.current;
    const img = imagemRef.current;
    if (!canvas || !img) return;

    canvas.width = img.naturalWidth;
    canvas.height = img.naturalHeight;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const { x, y, largura, altura } = leitura.boundingBox;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(img, 0, 0);

    ctx.fillStyle = 'rgba(0, 0, 0, 0.78)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    const margem = 6;
    ctx.save();
    ctx.beginPath();
    ctx.rect(x - margem, y - margem, largura + margem * 2, altura + margem * 2);
    ctx.clip();
    ctx.drawImage(img, 0, 0);
    ctx.restore();

    ctx.strokeStyle = '#2dd4bf';
    ctx.lineWidth = Math.max(3, canvas.width * 0.003);
    ctx.strokeRect(x - margem, y - margem, largura + margem * 2, altura + margem * 2);
  }

  async function selecionarMesa(mesa: string): Promise<void> {
    const leituras = await leiturasRepository.listarParaNavegacao(mesa);
    if (leituras.length === 0) return;
    definirLista(leituras, 0);
  }

  if (!leituraAtual) {
    return (
      <div className="flex flex-col gap-4 px-4 py-6">
        <header>
          <h1 className="text-xl font-bold text-base-50">Navegação</h1>
          <p className="text-sm text-base-400">Escolha uma mesa já processada para começar.</p>
        </header>
        <div className="flex flex-wrap gap-2">
          {mesas.map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => void selecionarMesa(m)}
              className="rounded-full bg-base-800 px-4 py-2 text-sm font-semibold text-base-200"
            >
              {m}
            </button>
          ))}
        </div>
        {mesas.length === 0 ? (
          <p className="text-center text-base-500">Nenhuma mesa cadastrada ainda.</p>
        ) : null}
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col">
      <div className="relative flex flex-1 items-center justify-center bg-black">
        {carregando ? <p className="absolute text-base-400">Carregando foto...</p> : null}
        <canvas ref={canvasRef} className="max-h-full max-w-full object-contain" />
      </div>

      <div className="border-t border-base-800 bg-base-900 px-4 py-4">
        <p className="text-xs uppercase tracking-wide text-base-500">
          {indiceAtual + 1} de {lista.length}
        </p>
        <h2 className="text-lg font-bold text-base-50">
          {funcionario?.nome ?? leituraAtual.nomeReconhecido ?? '(nome não identificado)'}
        </h2>
        <div className="mt-1 grid grid-cols-2 gap-x-4 gap-y-1 text-sm text-base-300">
          <span>Matrícula: {leituraAtual.matricula}</span>
          <span>Percentual: {leituraAtual.percentual.toFixed(1)}%</span>
          <span>Mesa: {funcionario?.mesa ?? leituraAtual.mesa}</span>
          <span>Posição: {funcionario?.posicao ?? '—'}</span>
        </div>

        <div className="mt-4 flex gap-3">
          <button
            type="button"
            onClick={anterior}
            disabled={indiceAtual === 0}
            className="btn-secundario flex-1"
          >
            ◀ Anterior
          </button>
          <button
            type="button"
            onClick={proximo}
            disabled={indiceAtual >= lista.length - 1}
            className="btn-primario flex-1"
          >
            Próximo ▶
          </button>
        </div>

        <button
          type="button"
          onClick={() => navigate('/')}
          className="mt-3 w-full text-center text-sm text-base-500"
        >
          Voltar ao início
        </button>
      </div>
    </div>
  );
}
