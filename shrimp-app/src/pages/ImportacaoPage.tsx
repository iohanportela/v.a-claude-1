import { useRef, useState } from 'react';
import { lerPlanilhaFuncionarios, importarFuncionarios, type ResultadoImportacao } from '@services/importacaoService';
import { useUiStore } from '@hooks/useUiStore';

export function ImportacaoPage(): JSX.Element {
  const inputRef = useRef<HTMLInputElement>(null);
  const [processando, setProcessando] = useState(false);
  const [resultado, setResultado] = useState<ResultadoImportacao | null>(null);
  const mostrarToast = useUiStore((e) => e.mostrarToast);

  async function lidarComArquivo(evento: React.ChangeEvent<HTMLInputElement>): Promise<void> {
    const arquivo = evento.target.files?.[0];
    if (!arquivo) return;

    setProcessando(true);
    setResultado(null);
    try {
      const linhas = await lerPlanilhaFuncionarios(arquivo);
      if (linhas.length === 0) {
        mostrarToast('Nenhuma linha reconhecida na planilha. Verifique o formato.', 'erro');
        return;
      }
      const resultadoImportacao = await importarFuncionarios(linhas);
      setResultado(resultadoImportacao);
      mostrarToast(
        `Importação concluída: ${resultadoImportacao.criados} cadastrados, ${resultadoImportacao.atualizados} atualizados.`,
        'sucesso'
      );
    } catch (erro) {
      mostrarToast(erro instanceof Error ? erro.message : 'Falha ao ler a planilha.', 'erro');
    } finally {
      setProcessando(false);
      if (inputRef.current) inputRef.current.value = '';
    }
  }

  return (
    <div className="flex flex-col gap-5 px-4 py-6">
      <header>
        <h1 className="text-xl font-bold text-base-50">Importação</h1>
        <p className="text-sm text-base-400">
          Cada coluna da planilha representa uma mesa. Cada célula preenchida no formato{' '}
          <span className="font-mono text-base-200">posição: nome</span>, por exemplo{' '}
          <span className="font-mono text-base-200">3: Anderson</span>.
        </p>
      </header>

      <div className="cartao flex flex-col items-center gap-4 py-8 text-center">
        <span className="text-4xl">📥</span>
        <p className="text-sm text-base-300">Selecione o arquivo .xlsx ou .csv da planilha de funcionários.</p>
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={processando}
          className="btn-primario w-full"
        >
          {processando ? 'Importando...' : 'Selecionar planilha'}
        </button>
        <input
          ref={inputRef}
          type="file"
          accept=".xlsx,.xls,.csv"
          className="hidden"
          onChange={(e) => void lidarComArquivo(e)}
        />
      </div>

      {resultado ? (
        <div className="cartao flex flex-col gap-2">
          <p className="text-success-400">✔ {resultado.criados} cadastrados</p>
          <p className="text-accent-400">✔ {resultado.atualizados} atualizados</p>
          {resultado.ignorados.length > 0 ? (
            <div className="mt-2">
              <p className="font-semibold text-danger-400">{resultado.ignorados.length} linhas ignoradas:</p>
              <ul className="mt-1 flex flex-col gap-1 text-sm text-base-400">
                {resultado.ignorados.map((item, indice) => (
                  <li key={indice}>
                    Linha {item.linha}: {item.motivo}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
