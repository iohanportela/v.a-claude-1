import { useState, type FormEvent } from 'react';
import type { NovoFuncionario } from '@domain/domain';

interface FormularioFuncionarioProps {
  valoresIniciais?: Pick<NovoFuncionario, 'matricula' | 'nome'> | undefined;
  onSalvar: (dados: NovoFuncionario) => Promise<void> | void;
  onCancelar: () => void;
  onExcluir?: (() => Promise<void> | void) | undefined;
}

export function FormularioFuncionario({
  valoresIniciais,
  onSalvar,
  onCancelar,
  onExcluir
}: FormularioFuncionarioProps): JSX.Element {
  const [matricula, setMatricula] = useState(valoresIniciais?.matricula ?? '');
  const [nome, setNome] = useState(valoresIniciais?.nome ?? '');
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  async function lidarComEnvio(evento: FormEvent): Promise<void> {
    evento.preventDefault();
    setErro(null);

    if (!matricula.trim() || !nome.trim()) {
      setErro('Preencha matrícula e nome.');
      return;
    }

    setSalvando(true);
    try {
      await onSalvar({ matricula: matricula.trim(), nome: nome.trim() });
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
