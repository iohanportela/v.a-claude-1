import type { ReactNode } from 'react';
import { BottomNav } from './BottomNav';
import { ToastContainer } from '@components/common/ToastContainer';

interface LayoutProps {
  children: ReactNode;
}

export function Layout({ children }: LayoutProps): JSX.Element {
  return (
    <div className="flex h-screen flex-col bg-base-950">
      <main className="flex-1 overflow-y-auto pb-24">{children}</main>
      <BottomNav />
      <ToastContainer />
    </div>
  );
}
