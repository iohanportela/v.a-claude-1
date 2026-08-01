import type { ReactNode } from 'react';
import { useLocation } from 'react-router-dom';
import { BottomNav } from './BottomNav';
import { ToastContainer } from '@components/common/ToastContainer';

interface LayoutProps {
  children: ReactNode;
}

export function Layout({ children }: LayoutProps): JSX.Element {
  const location = useLocation();
  const ehVisualizador = location.pathname.startsWith('/imagem/');

  return (
    <div className="flex h-screen flex-col bg-base-950">
      <main className={ehVisualizador ? 'flex-1 overflow-hidden' : 'flex-1 overflow-y-auto pb-24'}>
        {children}
      </main>
      {ehVisualizador ? null : <BottomNav />}
      <ToastContainer />
    </div>
  );
}
