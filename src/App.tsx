import { Routes, Route } from 'react-router-dom';
import { Layout } from '@components/layout/Layout';
import { HomePage } from '@pages/HomePage';
import { CadastroPage } from '@pages/CadastroPage';
import { ImportacaoPage } from '@pages/ImportacaoPage';
import { ProcessamentoPage } from '@pages/ProcessamentoPage';
import { PesquisaPage } from '@pages/PesquisaPage';
import { NavegacaoPage } from '@pages/NavegacaoPage';
import { ConfiguracoesPage } from '@pages/ConfiguracoesPage';

export default function App(): JSX.Element {
  return (
    <Layout>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/cadastro" element={<CadastroPage />} />
        <Route path="/cadastro/:mesa" element={<CadastroPage />} />
        <Route path="/importacao" element={<ImportacaoPage />} />
        <Route path="/processamento" element={<ProcessamentoPage />} />
        <Route path="/pesquisa" element={<PesquisaPage />} />
        <Route path="/navegacao" element={<NavegacaoPage />} />
        <Route path="/configuracoes" element={<ConfiguracoesPage />} />
      </Routes>
    </Layout>
  );
}
