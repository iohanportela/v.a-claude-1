import { useState, type FormEvent } from 'react';
import type { NovoFuncionario } from '@types/domain';

interface FormularioFuncionarioProps {
  valoresIniciais?: NovoFuncionario;
  /** Quando definidas, mesa e posição ficam bloqueadas (ex.: veio de um toque no mapa). */
  mesaFixa?: string;
  posicaoFixa?: number;
  mesasExistentes: string[];
  onSalvar: (dados: NovoFuncionario) => Promise<void> | void;
  onCancelar: () => void;
  onExcluir?: () => Promise<void> | void;
}

export function FormularioFuncionario({
  valoresIniciais,
  mesaFixa,
  posicaoFixa,
  mesasExistentes,
  onSalvar,
  onCancelar,
  onExcluir
}: FormularioFuncionarioProps): JSX.Element {
  const [matricula, setMatricula] = useState(valoresIniciais?.matricula ?? '');
  const [nome, setNome] = useState(valoresIniciais?.nome ?? '');
  const [mesa, setMesa] = useState(mesaFixa ?? valoresIniciais?.mesa ?? mesasExistentes[0] ?? '');
  const [posicao, setPosicao] = useState<number>(posicaoFixa ?? valoresIniciais?.posicao ?? 1);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  async function lidarComEnvio(evento: FormEvent): Promise<void> {
    evento.preventDefault();
    setErro(null);

    if (!matricula.trim() || !nome.trim() || !mesa.trim()) {
      setErro('Preencha matrícula, nome e mesa.');
      return;
    }
    if (posicao < 1 || posicao > 24) {
      setErro('Posição deve estar entre 1 e 24.');
      return;
    }

    setSalvando(true);
    try {
      await onSalvar({ matricula: matricula.trim(), nome: nome.trim(), mesa: mesa.trim(), posicao });
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Erro ao salvar funcionário.');
    } finally {
      setSalvando(false);
    }
  }

  return (
    <form onSubmit={lidarComEnvio} className="flex flex-col gap-4">
      {erro ? (
        <p className="rounded-lg bg-danger-500/15 px-3 py-2 text-sm text-danger-400">{erro}</p>
      ) : null}

      <label className="flex flex-col gap-1">
        <span className="text-sm font-medium text-base-300">Matrícula</span>
        <input
          className="campo-input"
          value={matricula}
          onChange={(e) => setMatricula(e.target.value)}
          inputMode="numeric"
          placeholder="Ex.: 00123"
          autoFocus
        />
      </label>

      <label className="flex flex-col gap-1">
        <span className="text-sm font-medium text-base-300">Nome</span>
        <input
          className="campo-input"
          value={nome}
          onChange={(e) => setNome(e.target.value.toUpperCase())}
          placeholder="Nome completo"
        />
      </label>

      <label className="flex flex-col gap-1">
        <span className="text-sm font-medium text-base-300">Mesa</span>
        <input
          className="campo-input"
          value={mesa}
          onChange={(e) => setMesa(e.target.value)}
          disabled={Boolean(mesaFixa)}
          placeholder="Ex.: Mesa 1"
          list="mesas-existentes"
        />
        <datalist id="mesas-existentes">
          {mesasExistentes.map((m) => (
            <option key={m} value={m} />
          ))}
        </datalist>
      </label>

      <label className="flex flex-col gap-1">
        <span className="text-sm font-medium text-base-300">Posição (1-24)</span>
        <input
          className="campo-input"
          type="number"
          min={1}
          max={24}
          value={posicao}
          onChange={(e) => setPosicao(Number.parseInt(e.target.value, 10) || 1)}
          disabled={Boolean(posicaoFixa)}
        />
      </label>

      <div className="mt-2 flex gap-3">
        <button type="button" onClick={onCancelar} className="btn-secundario flex-1">
          Cancelar
        </button>
        <button type="submit" disabled={salvando} className="btn-primario flex-1">
          {salvando ? 'Salvando...' : 'Salvar'}
        </button>
      </div>

      {onExcluir ? (
        <button
          type="button"
          onClick={() => void onExcluir()}
          className="btn-perigo mt-1"
          disabled={salvando}
        >
          Excluir funcionário
        </button>
      ) : null}
    </form>
  );
}
