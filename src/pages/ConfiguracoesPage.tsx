import { useRef, useState } from 'react';
import { exportarBanco, importarBanco, limparBanco, nomeArquivoBackup } from '@services/backupService';
import { useUiStore } from '@hooks/useUiStore';
import { Modal } from '@components/common/Modal';

export function ConfiguracoesPage(): JSX.Element {
  const inputRef = useRef<HTMLInputElement>(null);
  const [processando, setProcessando] = useState(false);
  const [confirmandoLimpeza, setConfirmandoLimpeza] = useState(false);
  const mostrarToast = useUiStore((e) => e.mostrarToast);

  async function exportar(): Promise<void> {
    setProcessando(true);
    try {
      const blob = await exportarBanco();
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = nomeArquivoBackup();
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
      mostrarToast('Backup exportado com sucesso.', 'sucesso');
    } catch (erro) {
      mostrarToast(erro instanceof Error ? erro.message : 'Falha ao exportar.', 'erro');
    } finally {
      setProcessando(false);
    }
  }

  async function lidarComImportacao(evento: React.ChangeEvent<HTMLInputElement>): Promise<void> {
    const arquivo = evento.target.files?.[0];
    if (!arquivo) return;

    setProcessando(true);
    try {
      await importarBanco(arquivo);
      mostrarToast('Banco de dados restaurado com sucesso.', 'sucesso');
    } catch (erro) {
      mostrarToast(erro instanceof Error ? erro.message : 'Arquivo de backup inválido.', 'erro');
    } finally {
      setProcessando(false);
      if (inputRef.current) inputRef.current.value = '';
    }
  }

  async function confirmarLimpeza(): Promise<void> {
    setProcessando(true);
    try {
      await limparBanco();
      mostrarToast('Todos os dados foram apagados.', 'sucesso');
    } finally {
      setProcessando(false);
      setConfirmandoLimpeza(false);
    }
  }

  return (
    <div className="flex flex-col gap-5 px-4 py-6">
      <header>
        <h1 className="text-xl font-bold text-base-50">Configurações</h1>
        <p className="text-sm text-base-400">Todos os dados ficam apenas neste aparelho.</p>
      </header>

      <button type="button" onClick={() => void exportar()} disabled={processando} className="btn-primario">
        Exportar banco de dados
      </button>

      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        disabled={processando}
        className="btn-secundario"
      >
        Importar banco de dados
      </button>
      <input
        ref={inputRef}
        type="file"
        accept="application/json"
        className="hidden"
        onChange={(e) => void lidarComImportacao(e)}
      />

      <button
        type="button"
        onClick={() => setConfirmandoLimpeza(true)}
        disabled={processando}
        className="btn-perigo"
      >
        Limpar banco de dados
      </button>

      <Modal aberto={confirmandoLimpeza} titulo="Confirmar limpeza" onFechar={() => setConfirmandoLimpeza(false)}>
        <p className="mb-5 text-base-300">
          Isso vai apagar permanentemente todos os funcionários, fotos e leituras. Esta ação não pode ser desfeita.
        </p>
        <div className="flex gap-3">
          <button type="button" onClick={() => setConfirmandoLimpeza(false)} className="btn-secundario flex-1">
            Cancelar
          </button>
          <button type="button" onClick={() => void confirmarLimpeza()} className="btn-perigo flex-1">
            Apagar tudo
          </button>
        </div>
      </Modal>
    </div>
  );
}
