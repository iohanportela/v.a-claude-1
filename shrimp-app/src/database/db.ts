import Dexie, { type Table } from 'dexie';
import type { Funcionario, Foto, Leitura } from '@types/domain';

/**
 * Banco local único do aplicativo. Todo armazenamento é local via IndexedDB
 * (através do Dexie). Nenhum dado é enviado para qualquer servidor.
 */
export class ProdutividadeDatabase extends Dexie {
  funcionarios!: Table<Funcionario, string>;
  fotos!: Table<Foto, string>;
  leituras!: Table<Leitura, string>;

  constructor() {
    super('produtividade-camarao-db');

    this.version(1).stores({
      // matricula é índice único (prefixo &); mesa+posicao é índice composto
      // usado para renderizar o mapa da mesa rapidamente.
      funcionarios: 'id, &matricula, mesa, [mesa+posicao], nome',
      fotos: 'id, mesa, capturadaEm, processada',
      leituras: 'id, fotoId, mesa, matricula, funcionarioId, ordem, criadaEm'
    });
  }
}

export const db = new ProdutividadeDatabase();

/**
 * Garante que o banco foi aberto antes do primeiro uso. Chamar uma vez
 * na inicialização do app (main.tsx) para falhar cedo e de forma visível
 * caso o IndexedDB não esteja disponível no dispositivo.
 */
export async function abrirBancoOuFalhar(): Promise<void> {
  try {
    await db.open();
  } catch (erro) {
    console.error('Falha ao abrir o banco local (IndexedDB):', erro);
    throw new Error(
      'Não foi possível abrir o banco de dados local. Verifique se o navegador/WebView permite armazenamento.'
    );
  }
}
