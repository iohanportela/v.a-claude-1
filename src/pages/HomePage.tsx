import { Link } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@database/db';

interface AtalhoProps {
  para: string;
  titulo: string;
  descricao: string;
  icone: string;
}

function Atalho({ para, titulo, descricao, icone }: AtalhoProps): JSX.Element {
  return (
    <Link to={para} className="cartao flex items-center gap-4 active:scale-[0.98]">
      <span className="text-3xl">{icone}</span>
      <span className="flex flex-col">
        <span className="text-base font-semibold text-base-50">{titulo}</span>
        <span className="text-sm text-base-400">{descricao}</span>
      </span>
    </Link>
  );
}

export function HomePage(): JSX.Element {
  const totalFuncionarios = useLiveQuery(() => db.funcionarios.count(), [], 0) ?? 0;
  const totalMesas = useLiveQuery(() => db.mesas.count(), [], 0) ?? 0;
  const fotosPendentes = useLiveQuery(
    () => db.fotos.filter((foto) => !foto.processada).count(),
    [],
    0
  ) ?? 0;

  return (
    <div className="flex flex-col gap-6 px-4 py-6">
      <header>
        <h1 className="text-2xl font-bold text-base-50">Produtividade</h1>
        <p className="text-sm text-base-400">Evisceração de camarão</p>
      </header>

      <div className="grid grid-cols-3 gap-3">
        <div className="cartao text-center">
          <p className="text-2xl font-bold text-accent-400">{totalFuncionarios}</p>
          <p className="text-xs text-base-400">funcionários</p>
        </div>
        <div className="cartao text-center">
          <p className="text-2xl font-bold text-accent-400">{totalMesas}</p>
          <p className="text-xs text-base-400">mesas</p>
        </div>
        <div className="cartao text-center">
          <p className="text-2xl font-bold text-warning-400">{fotosPendentes}</p>
          <p className="text-xs text-base-400">fotos pendentes</p>
        </div>
      </div>

      <div className="flex flex-col gap-3">
        <Atalho para="/processamento" titulo="Processar fotos" descricao="Ler produtividade por OCR" icone="📸" />
        <Atalho para="/navegacao" titulo="Navegar" descricao="Ver funcionário por funcionário" icone="➡️" />
        <Atalho para="/pesquisa" titulo="Pesquisar" descricao="Buscar por nome ou matrícula" icone="🔍" />
        <Atalho para="/cadastro" titulo="Cadastro" descricao="Gerenciar mesas e posições" icone="🧾" />
        <Atalho para="/importacao" titulo="Importar planilha" descricao="Cadastro em massa" icone="📥" />
        <Atalho para="/configuracoes" titulo="Configurações" descricao="Backup e limpeza do banco" icone="⚙️" />
      </div>
    </div>
  );
}
