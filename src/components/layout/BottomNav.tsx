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
  {
    rota: '/',
    rotulo: 'Biblioteca',
    icone: <Icone path="M4 5h16v14H4V5Zm0 10 4-4 4 4 4-6 4 6" />
  },
  {
    rota: '/pesquisa',
    rotulo: 'Pesquisar',
    icone: <Icone path="M11 19a8 8 0 1 1 0-16 8 8 0 0 1 0 16Zm10 2-5.5-5.5" />
  }
];

export function BottomNav(): JSX.Element {
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-20 border-t border-base-800 bg-base-900/95 backdrop-blur">
      <ul className="mx-auto flex max-w-xl items-stretch justify-around px-1">
        {ITENS.map((item) => (
          <li key={item.rota} className="flex-1">
            <NavLink
              to={item.rota}
              end={item.rota === '/'}
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
