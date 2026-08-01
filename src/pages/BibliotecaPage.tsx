import { useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useImagens } from '@hooks/useImagens';
import { imagensRepository } from '@database/index';
import { obterDimensoesImagem, fileParaBlob } from '@utils/imagem';
import { importarImagem } from '@services/importService';
import { cameraService } from '@services/camera/CameraService';
import { useUiStore } from '@hooks/useUiStore';
import { MiniaturaImagem } from '@components/imagem/MiniaturaImagem';
import { Modal } from '@components/common/Modal';

export function BibliotecaPage(): JSX.Element {
  const imagens = useImagens();
  const navigate = useNavigate();
  const mostrarToast = useUiStore((e) => e.mostrarToast);
  const inputRef = useRef<HTMLInputElement>(null);

  const [importando, setImportando] = useState(false);
  const [progresso, setProgresso] = useState<{ atual: number; total: number } | null>(null);
  const [paraExcluir, setParaExcluir] = useState<string | null>(null);

  async function importarBlobs(blobs: Blob[]): Promise<void> {
    if (blobs.length === 0) return;

    setImportando(true);
    setProgresso({ atual: 0, total: blobs.length });

    let sucesso = 0;
    for (let i = 0; i < blobs.length; i++) {
      const blob = blobs[i];
      if (!blob) continue;
      try {
        const { largura, altura } = await obterDimensoesImagem(blob);
        await importarImagem({
          nome: `Foto ${new Date().toLocaleDateString('pt-BR')} ${i + 1}`,
          imagem: blob,
          largura,
          altura
        });
        sucesso++;
      } catch (erro) {
        mostrarToast(erro instanceof Error ? erro.message : 'Falha ao importar uma imagem.', 'erro');
      }
      setProgresso({ atual: i + 1, total: blobs.length });
    }

    setImportando(false);
    setProgresso(null);
    if (sucesso > 0) {
      mostrarToast(`${sucesso} imagem(ns) importada(s) e já pesquisável(is).`, 'sucesso');
    }
  }

  async function tirarFoto(): Promise<void> {
    try {
      const blob = await cameraService.tirarFoto();
      await importarBlobs([blob]);
    } catch (erro) {
      mostrarToast(erro instanceof Error ? erro.message : 'Não foi possível abrir a câmera.', 'erro');
    }
  }

  async function escolherDaGaleria(): Promise<void> {
    try {
      const blobs = await cameraService.escolherDaGaleria(true);
      await importarBlobs(blobs);
    } catch (erro) {
      mostrarToast(erro instanceof Error ? erro.message : 'Não foi possível abrir a galeria.', 'erro');
    }
  }

  async function lidarComInputArquivo(evento: React.ChangeEvent<HTMLInputElement>): Promise<void> {
    const arquivos = Array.from(evento.target.files ?? []);
    await importarBlobs(arquivos.map(fileParaBlob));
    if (inputRef.current) inputRef.current.value = '';
  }

  async function confirmarExclusao(): Promise<void> {
    if (!paraExcluir) return;
    await imagensRepository.remover(paraExcluir);
    mostrarToast('Imagem excluída.', 'sucesso');
    setParaExcluir(null);
  }

  return (
    <div className="flex flex-col gap-5 px-4 py-6">
      <header>
        <h1 className="text-xl font-bold text-base-50">Biblioteca</h1>
        <p className="text-sm text-base-400">
          Importe fotos da lista de produtividade — o texto é lido uma vez e fica pronto para pesquisar.
        </p>
      </header>

      <div className="grid grid-cols-2 gap-3">
        <button type="button" onClick={() => void tirarFoto()} disabled={importando} className="btn-primario">
          📷 Tirar foto
        </button>
        <button
          type="button"
          onClick={() => void escolherDaGaleria()}
          disabled={importando}
          className="btn-secundario"
        >
          🖼️ Da galeria
        </button>
      </div>

      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        disabled={importando}
        className="text-center text-sm text-base-500 underline"
      >
        ou selecionar arquivo manualmente
      </button>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={(e) => void lidarComInputArquivo(e)}
      />

      {importando && progresso ? (
        <div className="cartao text-center text-sm text-base-300">
          Lendo texto da imagem {progresso.atual} de {progresso.total}...
        </div>
      ) : null}

      {imagens.length === 0 && !importando ? (
        <p className="py-10 text-center text-base-500">Nenhuma imagem importada ainda.</p>
      ) : (
        <div className="grid grid-cols-3 gap-3">
          {imagens.map((imagem) => (
            <div key={imagem.id} className="relative">
              <button
                type="button"
                onClick={() => navigate(`/imagem/${imagem.id}`)}
                className="block w-full active:scale-95"
              >
                <MiniaturaImagem imagem={imagem} className="aspect-square w-full rounded-xl object-cover" />
              </button>
              <button
                type="button"
                onClick={() => setParaExcluir(imagem.id)}
                className="absolute right-1 top-1 rounded-full bg-black/70 p-1.5 text-danger-400"
                aria-label="Excluir imagem"
              >
                <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={2}>
                  <path d="M6 6l12 12M18 6 6 18" strokeLinecap="round" />
                </svg>
              </button>
            </div>
          ))}
        </div>
      )}

      <Modal aberto={paraExcluir !== null} titulo="Excluir imagem" onFechar={() => setParaExcluir(null)}>
        <p className="mb-5 text-base-300">
          Isso remove a imagem e todo o texto reconhecido nela. Esta ação não pode ser desfeita.
        </p>
        <div className="flex gap-3">
          <button type="button" onClick={() => setParaExcluir(null)} className="btn-secundario flex-1">
            Cancelar
          </button>
          <button type="button" onClick={() => void confirmarExclusao()} className="btn-perigo flex-1">
            Excluir
          </button>
        </div>
      </Modal>
    </div>
  );
}
