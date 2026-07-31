import { NavLink } from 'react-router-dom';
import clsx from 'clsx';

interface ItemNav {
  rota: string;
  rotulo: string;
  icone: JSX.Element;
}

function Icone({ path }: { path: string }): JSX.Element {
  return (
    <svg viewBox="0 0 24 24" fill="none" className="h-6 w-6" stroke="currentColor" strokeWidth={1.8}>
      <path d={path} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

const ITENS: ItemNav[] = [
  { rota: '/', rotulo: 'Início', icone: <Icone path="M3 11.5 12 4l9 7.5M5 10v9h14v-9" /> },
  { rota: '/pesquisa', rotulo: 'Buscar', icone: <Icone path="M11 19a8 8 0 1 1 0-16 8 8 0 0 1 0 16Zm10 2-5.5-5.5" /> },
  { rota: '/processamento', rotulo: 'Processar', icone: <Icone path="M4 6h16M4 12h10M4 18h16" /> },
  { rota: '/navegacao', rotulo: 'Navegar', icone: <Icone path="M9 6 15 12 9 18" /> },
  { rota: '/configuracoes', rotulo: 'Ajustes', icone: <Icone path="M10.3 3h3.4l.7 2.6a7 7 0 0 1 2 1.15l2.6-.7 1.7 2.95-1.9 1.85a7 7 0 0 1 0 2.3l1.9 1.85-1.7 2.95-2.6-.7a7 7 0 0 1-2 1.15L13.7 21h-3.4l-.7-2.6a7 7 0 0 1-2-1.15l-2.6.7-1.7-2.95 1.9-1.85a7 7 0 0 1 0-2.3L2.3 8.8 4 5.85l2.6.7a7 7 0 0 1 2-1.15L10.3 3ZM12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z" /> }
];

export function BottomNav(): JSX.Element {
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-20 border-t border-base-800 bg-base-900/95 backdrop-blur">
      <ul className="mx-auto flex max-w-xl items-stretch justify-between px-1">
        {ITENS.map((item) => (
          <li key={item.rota} className="flex-1">
            <NavLink
              to={item.rota}
              className={({ isActive }) =>
                clsx(
                  'flex flex-col items-center gap-1 py-3 text-xs font-medium transition-colors',
                  isActive ? 'text-accent-400' : 'text-base-400'
                )
              }
            >
              {item.icone}
              {item.rotulo}
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  );
}
