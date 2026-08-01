import { useEffect, useRef, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { useMesas, useMapaMesa, useLayoutVisualMesa } from '@hooks/useFuncionarios';
import { fotosRepository, funcionariosRepository, lugaresRepository, mesasRepository } from '@database/index';
import { obterDimensoesImagem, fileParaBlob } from '@utils/imagem';
import { processarFoto, resolverPendencia } from '@services/processamentoService';
import { useProcessamentoStore } from '@hooks/useProcessamentoStore';
import { useUiStore } from '@hooks/useUiStore';
import { Modal } from '@components/common/Modal';
import { MesaGrid } from '@components/mesa/MesaGrid';
import { FormularioFuncionario } from '@components/funcionario/FormularioFuncionario';
import type { Foto, NovoFuncionario } from '@domain/domain';

export function ProcessamentoPage(): JSX.Element {
  const mesas = useMesas();
  const layout = useLayoutVisualMesa();
  const mostrarToast = useUiStore((e) => e.mostrarToast);
  const inputRef = useRef<HTMLInputElement>(null);

  const [mesaAlvo, setMesaAlvo] = useState<string>('');
  const [posicaoParaCadastro, setPosicaoParaCadastro] = useState<number | null>(null);

  const fotosNaoProcessadas = useLiveQuery(() => fotosRepository.listarNaoProcessadas(), [], []) ?? [];

  const {
    processando,
    progresso,
    filaPendencias,
    pendenciaAtual,
    resultados,
    iniciar,
    avancarProgresso,
    registrarResultado,
    enfileirarPendencias,
    resolverPendenciaAtual,
    finalizar,
    reiniciar
  } = useProcessamentoStore();

  const mapaMesaPendencia = useMapaMesa(pendenciaAtual?.mesa ?? null);

  async function adicionarFotos(evento: React.ChangeEvent<HTMLInputElement>): Promise<void> {
    const arquivos = Array.from(evento.target.files ?? []);
    if (arquivos.length === 0 || !mesaAlvo) return;

    for (const arquivo of arquivos) {
      const blob = fileParaBlob(arquivo);
      const { largura, altura } = await obterDimensoesImagem(blob);
      await fotosRepository.criar({ mesa: mesaAlvo, imagem: blob, largura, altura });
    }

    mostrarToast(`${arquivos.length} foto(s) adicionada(s) à ${mesaAlvo}.`, 'sucesso');
    if (inputRef.current) inputRef.current.value = '';
  }

  async function iniciarProcessamento(fotos: Foto[]): Promise<void> {
    if (fotos.length === 0) {
      mostrarToast('Nenhuma foto pendente para processar.', 'info');
      return;
    }

    reiniciar();
    iniciar(fotos.length);

    for (const foto of fotos) {
      try {
        const resultado = await processarFoto(foto);
        registrarResultado(resultado);
        if (resultado.pendencias.length > 0) {
          enfileirarPendencias(resultado.pendencias);
        }
      } catch (erro) {
        mostrarToast(
          `Falha ao processar uma foto da ${foto.mesa}: ${erro instanceof Error ? erro.message : 'erro desconhecido'}`,
          'erro'
        );
      }
      avancarProgresso();
    }

    finalizar();
  }

  async function cadastrarPendenciaNaPosicao(posicao: number): Promise<void> {
    if (!pendenciaAtual) return;
    const ocupante = mapaMesaPendencia.find((m) => m.posicao === posicao);
    if (ocupante?.ocupada) {
      mostrarToast('Essa posição já está ocupada. Escolha um lugar vazio (verde).', 'info');
      return;
    }
    setPosicaoParaCadastro(posicao);
  }

  async function salvarNovoFuncionarioDaPendencia(dados: NovoFuncionario): Promise<void> {
    if (!pendenciaAtual || posicaoParaCadastro === null) return;

    const funcionario = await funcionariosRepository.criar(dados);
    const mesa = await mesasRepository.buscarPorNome(pendenciaAtual.mesa);
    if (!mesa) {
      mostrarToast('Mesa não encontrada.', 'erro');
      return;
    }

    await lugaresRepository.atribuirFuncionarioAoLugar(mesa.id, posicaoParaCadastro, funcionario.id);
    await resolverPendencia(pendenciaAtual, funcionario.id);
    mostrarToast(`Funcionário ${funcionario.nome} cadastrado na posição ${posicaoParaCadastro}.`, 'sucesso');
    setPosicaoParaCadastro(null);
    resolverPendenciaAtual();
  }

  const totalLeiturasResultado = resultados.reduce((soma, r) => soma + r.leiturasRegistradas.length, 0);

  return (
    <div className="flex flex-col gap-5 px-4 py-6">
      <header>
        <h1 className="text-xl font-bold text-base-50">Processamento</h1>
        <p className="text-sm text-base-400">Adicione as fotos da tela do sistema e processe por mesa.</p>
      </header>

      <div className="flex flex-wrap gap-2">
        {mesas.map((m) => (
          <button
            key={m}
            type="button"
            onClick={() => setMesaAlvo(m)}
            className={`rounded-full px-4 py-2 text-sm font-semibold ${
              m === mesaAlvo ? 'bg-accent-600 text-base-950' : 'bg-base-800 text-base-200'
            }`}
          >
            {m}
          </button>
        ))}
      </div>

      <div className="cartao flex flex-col items-center gap-3 py-6 text-center">
        <span className="text-3xl">📷</span>
        <p className="text-sm text-base-300">
          {mesaAlvo ? `Fotos serão adicionadas à ${mesaAlvo}` : 'Selecione uma mesa acima primeiro'}
        </p>
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={!mesaAlvo}
          className="btn-primario w-full"
        >
          Adicionar fotos
        </button>
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          capture="environment"
          multiple
          className="hidden"
          onChange={(e) => void adicionarFotos(e)}
        />
      </div>

      <div className="cartao">
        <div className="mb-2 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-base-200">Fotos pendentes de processamento</h2>
          <span className="text-sm text-base-400">{fotosNaoProcessadas.length}</span>
        </div>

        {fotosNaoProcessadas.length === 0 ? (
          <p className="py-4 text-center text-sm text-base-500">Nenhuma foto pendente.</p>
        ) : (
          <div className="flex gap-2 overflow-x-auto pb-1">
            {fotosNaoProcessadas.map((foto) => (
              <div key={foto.id} className="flex flex-col items-center gap-1">
                <MiniaturaFoto foto={foto} />
                <span className="text-[0.65rem] text-base-500">{foto.mesa}</span>
              </div>
            ))}
          </div>
        )}

        <button
          type="button"
          onClick={() => void iniciarProcessamento(fotosNaoProcessadas)}
          disabled={processando || fotosNaoProcessadas.length === 0}
          className="btn-primario mt-4 w-full"
        >
          {processando ? `Processando ${progresso.atual}/${progresso.total}...` : 'Processar todas as fotos'}
        </button>
      </div>

      {resultados.length > 0 && !processando ? (
        <div className="cartao">
          <h2 className="mb-2 text-sm font-semibold text-base-200">Último processamento</h2>
          <p className="text-success-400">{totalLeiturasResultado} leituras registradas</p>
          <p className="text-base-400">
            {resultados.reduce((s, r) => s + r.duplicadasIgnoradas, 0)} matrículas duplicadas ignoradas
          </p>
        </div>
      ) : null}

      <Modal
        aberto={pendenciaAtual !== null}
        titulo={`Funcionário novo: matrícula ${pendenciaAtual?.matricula ?? ''}`}
        onFechar={null}
      >
        {pendenciaAtual ? (
          <div className="flex flex-col gap-4">
            <p className="text-sm text-base-300">
              Nome reconhecido pelo OCR:{' '}
              <span className="font-semibold text-base-50">{pendenciaAtual.nomeReconhecido ?? '(não reconhecido)'}</span>
              <br />
              Mesa: <span className="font-semibold text-base-50">{pendenciaAtual.mesa}</span>
            </p>

            {posicaoParaCadastro === null ? (
              <>
                <p className="text-xs text-base-400">
                  Vermelho = ocupado · Verde = vazio. Toque numa posição verde para cadastrar.
                </p>
                <MesaGrid
                  layout={layout}
                  mapa={mapaMesaPendencia}
                  onSelecionarPosicao={(p) => void cadastrarPendenciaNaPosicao(p)}
                  modo="pendencia"
                />
                <span className="text-center text-sm text-base-500">
                  {filaPendencias.length} pendência(s) restante(s)
                </span>
              </>
            ) : (
              <FormularioFuncionario
                valoresIniciais={{
                  matricula: pendenciaAtual.matricula,
                  nome: pendenciaAtual.nomeReconhecido ?? ''
                }}
                onSalvar={salvarNovoFuncionarioDaPendencia}
                onCancelar={() => setPosicaoParaCadastro(null)}
              />
            )}
          </div>
        ) : null}
      </Modal>
    </div>
  );
}

function MiniaturaFoto({ foto }: { foto: Foto }): JSX.Element {
  const [url, setUrl] = useState<string | null>(null);

  useEffect(() => {
    const objectUrl = fotosRepository.criarUrlObjeto(foto);
    setUrl(objectUrl);
    return () => URL.revokeObjectURL(objectUrl);
  }, [foto]);

  if (!url) {
    return <div className="h-16 w-16 shrink-0 rounded-lg border border-base-700 bg-base-800" />;
  }

  return (
    <img
      src={url}
      alt={`Foto da ${foto.mesa}`}
      className="h-16 w-16 shrink-0 rounded-lg border border-base-700 object-cover"
    />
  );
}
