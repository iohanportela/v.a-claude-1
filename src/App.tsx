import { Routes, Route } from 'react-router-dom';
import { Layout } from '@components/layout/Layout';
import { BibliotecaPage } from '@pages/BibliotecaPage';
import { PesquisaPage } from '@pages/PesquisaPage';
import { VisualizadorPage } from '@pages/VisualizadorPage';

export default function App(): JSX.Element {
  return (
    <Layout>
      <Routes>
        <Route path="/" element={<BibliotecaPage />} />
        <Route path="/pesquisa" element={<PesquisaPage />} />
        <Route path="/imagem/:id" element={<VisualizadorPage />} />
      </Routes>
    </Layout>
  );
}
