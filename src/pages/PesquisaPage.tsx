import { useNavigate } from 'react-router-dom';
import { usePesquisaFuncionarios } from '@hooks/useFuncionarios';
import { leiturasRepository } from '@database/index';
import { useNavegacaoStore } from '@hooks/useNavegacaoStore';
import { useUiStore } from '@hooks/useUiStore';

export function PesquisaPage(): JSX.Element {
  const { termo, setTermo, resultados } = usePesquisaFuncionarios();
  const navigate = useNavigate();
  const definirLista = useNavegacaoStore((e) => e.definirLista);
  const mostrarToast = useUiStore((e) => e.mostrarToast);

  async function abrirNaNavegacao(funcionarioId: string): Promise<void> {
    const leituras = await leiturasRepository.listarParaNavegacao();
    const indice = leituras.findIndex((l) => l.funcionarioId === funcionarioId);

    if (indice === -1) {
      mostrarToast('Este funcionário ainda não possui leitura de produtividade processada.', 'info');
      return;
    }

    definirLista(leituras, indice);
    navigate('/navegacao');
  }

  return (
    <div className="flex flex-col gap-4 px-4 py-6">
      <header>
        <h1 className="text-xl font-bold text-base-50">Pesquisar</h1>
      </header>

      <input
        className="campo-input"
        placeholder="Nome ou matrícula..."
        value={termo}
        onChange={(e) => setTermo(e.target.value)}
        autoFocus
      />

      <div className="flex flex-col gap-2">
        {resultados.map((funcionario) => (
          <button
            key={funcionario.id}
            type="button"
            onClick={() => void abrirNaNavegacao(funcionario.id)}
            className="cartao flex items-center justify-between text-left active:scale-[0.98]"
          >
            <span className="flex flex-col">
              <span className="font-semibold text-base-50">{funcionario.nome}</span>
              <span className="text-sm text-base-400">Mat. {funcionario.matricula}</span>
            </span>
            <span className="text-accent-400">➜</span>
          </button>
        ))}

        {termo.trim() && resultados.length === 0 ? (
          <p className="text-center text-base-400">Nenhum funcionário encontrado.</p>
        ) : null}
      </div>
    </div>
  );
}
