import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App';
import { abrirBancoOuFalhar } from '@database/db';
import './styles/index.css';

async function iniciar(): Promise<void> {
  const raiz = document.getElementById('root');
  if (!raiz) {
    throw new Error('Elemento #root não encontrado no index.html.');
  }

  try {
    await abrirBancoOuFalhar();
  } catch (erro) {
    console.error(erro);
  }

  ReactDOM.createRoot(raiz).render(
    <React.StrictMode>
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </React.StrictMode>
  );
}

void iniciar();
