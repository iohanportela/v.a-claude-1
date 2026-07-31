import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useMesas, useMapaMesa, useLayoutVisualMesa } from '@hooks/useFuncionarios';
import { funcionariosRepository } from '@database/index';
import { MesaGrid } from '@components/mesa/MesaGrid';
import { Modal } from '@components/common/Modal';
import { FormularioFuncionario } from '@components/funcionario/FormularioFuncionario';
import { useUiStore } from '@hooks/useUiStore';
import type { Funcionario, NovoFuncionario } from '@types/domain';

export function CadastroPage(): JSX.Element {
  const { mesa: mesaDaRota } = useParams<{ mesa?: string }>();
  const navigate = useNavigate();
  const mostrarToast = useUiStore((e) => e.mostrarToast);

  const mesas = useMesas();
  const [mesaSelecionada, setMesaSelecionada] = useState<string>(mesaDaRota ?? '');
  const [novaMesaTexto, setNovaMesaTexto] = useState('');
  const layout = useLayoutVisualMesa();
  const mapa = useMapaMesa(mesaSelecionada || null);

  const [posicaoSelecionada, setPosicaoSelecionada] = useState<number | null>(null);
  const [funcionarioEmEdicao, setFuncionarioEmEdicao] = useState<Funcionario | null>(null);
  const [modalAberto, setModalAberto] = useState(false);

  useEffect(() => {
    if (!mesaSelecionada && mesas.length > 0 && mesas[0]) {
      setMesaSelecionada(mesas[0]);
    }
  }, [mesas, mesaSelecionada]);

  function abrirPosicao(posicao: number): void {
    const item = mapa.find((m) => m.posicao === posicao);
    setPosicaoSelecionada(posicao);
    setFuncionarioEmEdicao(item?.funcionario ?? null);
    setModalAberto(true);
  }

  function fecharModal(): void {
    setModalAberto(false);
    setPosicaoSelecionada(null);
    setFuncionarioEmEdicao(null);
  }

  async function salvar(dados: NovoFuncionario): Promise<void> {
    if (funcionarioEmEdicao) {
      await funcionariosRepository.atualizar(funcionarioEmEdicao.id, dados);
      mostrarToast('Funcionário atualizado.', 'sucesso');
    } else {
      await funcionariosRepository.criar(dados);
      mostrarToast('Funcionário cadastrado.', 'sucesso');
    }
    fecharModal();
  }

  async function excluir(): Promise<void> {
    if (!funcionarioEmEdicao) return;
    await funcionariosRepository.remover(funcionarioEmEdicao.id);
    mostrarToast('Funcionário removido.', 'sucesso');
    fecharModal();
  }

  function criarNovaMesa(): void {
    const nome = novaMesaTexto.trim();
    if (!nome) return;
    setMesaSelecionada(nome);
    setNovaMesaTexto('');
    navigate(`/cadastro/${encodeURIComponent(nome)}`, { replace: true });
  }

  return (
    <div className="flex flex-col gap-5 px-4 py-6">
      <header>
        <h1 className="text-xl font-bold text-base-50">Cadastro</h1>
        <p className="text-sm text-base-400">Toque num lugar vazio para cadastrar, ou num nome para editar.</p>
      </header>

      <div className="flex flex-wrap gap-2">
        {mesas.map((m) => (
          <button
            key={m}
            type="button"
            onClick={() => {
              setMesaSelecionada(m);
              navigate(`/cadastro/${encodeURIComponent(m)}`, { replace: true });
            }}
            className={`rounded-full px-4 py-2 text-sm font-semibold ${
              m === mesaSelecionada ? 'bg-accent-600 text-base-950' : 'bg-base-800 text-base-200'
            }`}
          >
            {m}
          </button>
        ))}
      </div>

      <div className="cartao flex items-center gap-2">
        <input
          className="campo-input"
          placeholder="Nova mesa (ex.: Mesa 3)"
          value={novaMesaTexto}
          onChange={(e) => setNovaMesaTexto(e.target.value)}
        />
        <button type="button" onClick={criarNovaMesa} className="btn-primario shrink-0 px-4 py-3">
          Criar
        </button>
      </div>

      {mesaSelecionada ? (
        <div className="cartao">
          <h2 className="mb-3 text-center text-sm font-semibold text-base-300">{mesaSelecionada}</h2>
          <MesaGrid layout={layout} mapa={mapa} onSelecionarPosicao={abrirPosicao} />
        </div>
      ) : (
        <p className="text-center text-base-400">Crie uma mesa para começar.</p>
      )}

      <Modal
        aberto={modalAberto}
        titulo={funcionarioEmEdicao ? 'Editar funcionário' : `Cadastrar posição ${posicaoSelecionada ?? ''}`}
        onFechar={fecharModal}
      >
        <FormularioFuncionario
          valoresIniciais={
            funcionarioEmEdicao
              ? {
                  matricula: funcionarioEmEdicao.matricula,
                  nome: funcionarioEmEdicao.nome,
                  mesa: funcionarioEmEdicao.mesa,
                  posicao: funcionarioEmEdicao.posicao
                }
              : undefined
          }
          mesaFixa={mesaSelecionada}
          posicaoFixa={posicaoSelecionada ?? undefined}
          mesasExistentes={mesas}
          onSalvar={salvar}
          onCancelar={fecharModal}
          onExcluir={funcionarioEmEdicao ? excluir : undefined}
        />
      </Modal>
    </div>
  );
}
