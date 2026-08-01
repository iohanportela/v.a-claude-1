import Dexie, { type Table } from 'dexie';
import type { Imagem, Palavra } from '@domain/domain';

/**
 * Banco local único do aplicativo. Todo armazenamento é local via IndexedDB
 * (através do Dexie). Nenhum dado é enviado para qualquer servidor.
 *
 * Histórico de versões:
 * v1: schema original de funcionário com mesa/posição embutidos.
 * v2: Mesa/Lugar viram tabelas próprias, funcionários independentes.
 * v3 (atual): projeto pivotado para buscador de imagens com OCR. Todo o
 *     domínio anterior (funcionários, mesas, lugares, leituras de
 *     produtividade) não tem equivalente no novo modelo, então essas
 *     tabelas são removidas — Dexie apaga automaticamente qualquer
 *     tabela que não apareça no `.stores()` de uma versão nova. Só
 *     restam `imagens` (as fotos importadas) e `palavras` (cada palavra
 *     reconhecida pelo OCR, com sua posição).
 */
export class ProdutividadeDatabase extends Dexie {
  imagens!: Table<Imagem, string>;
  palavras!: Table<Palavra, string>;

  constructor() {
    super('produtividade-camarao-db');

    this.version(1).stores({
      funcionarios: 'id, &matricula, mesa, [mesa+posicao], nome',
      fotos: 'id, mesa, capturadaEm, processada',
      leituras: 'id, fotoId, mesa, matricula, funcionarioId, ordem, criadaEm'
    });

    this.version(2).stores({
      mesas: 'id, nome',
      lugares: 'id, mesaId, [mesaId+numeroPosicao], funcionarioId',
      funcionarios: 'id, &matricula, nome',
      fotos: 'id, mesaId, capturadaEm, processada',
      leituras: 'id, fotoId, mesaId, matricula, funcionarioId, criadaEm'
    });

    this.version(3).stores({
      // null remove a tabela — todo o domínio de funcionário/mesa/produtividade sai.
      mesas: null,
      lugares: null,
      funcionarios: null,
      fotos: null,
      leituras: null,
      imagens: 'id, nome, importadaEm, ocrProcessado',
      palavras: 'id, imagemId, textoNormalizado, [imagemId+textoNormalizado]'
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
