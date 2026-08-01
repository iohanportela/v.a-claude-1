import Dexie, { type Table } from 'dexie';
import { v4 as uuid } from 'uuid';
import type { Funcionario, Foto, Leitura, Mesa, Lugar } from '@domain/domain';

/**
 * Banco local único do aplicativo. Todo armazenamento é local via IndexedDB
 * (através do Dexie). Nenhum dado é enviado para qualquer servidor.
 */
export class ProdutividadeDatabase extends Dexie {
  funcionarios!: Table<Funcionario, string>;
  fotos!: Table<Foto, string>;
  leituras!: Table<Leitura, string>;
  mesas!: Table<Mesa, string>;
  lugares!: Table<Lugar, string>;

  constructor() {
    super('produtividade-camarao-db');

    this.version(1).stores({
      // matricula é índice único (prefixo &); mesa+posicao é índice composto
      // usado para renderizar o mapa da mesa rapidamente.
      funcionarios: 'id, &matricula, mesa, [mesa+posicao], nome',
      fotos: 'id, mesa, capturadaEm, processada',
      leituras: 'id, fotoId, mesa, matricula, funcionarioId, ordem, criadaEm'
    });

    this.version(2)
      .stores({
        mesas: 'id, &nome, criadoEm, atualizadoEm',
        lugares: 'id, [mesaId+numeroPosicao], funcionarioId',
        funcionarios: 'id, &matricula, criadoEm, atualizadoEm',
        fotos: 'id, mesa, mesaId, capturadaEm, processada',
        leituras: 'id, fotoId, mesa, matricula, funcionarioId, ordem, criadaEm'
      })
      .upgrade(async (trans) => {
        const antigos = (await trans.table('funcionarios').toArray()) as Array<
          Funcionario & { mesa?: string; posicao?: number }
        >;

        const mesasCriadas = new Map<string, Mesa>();

        for (const item of antigos) {
          const mesaNome = item.mesa?.trim();
          const posicao = item.posicao;
          if (!mesaNome || typeof posicao !== 'number' || posicao < 1 || posicao > 24) {
            continue;
          }
          if (!mesasCriadas.has(mesaNome)) {
            mesasCriadas.set(mesaNome, {
              id: uuid(),
              nome: mesaNome,
              criadoEm: Date.now(),
              atualizadoEm: Date.now()
            });
          }
        }

        if (mesasCriadas.size > 0) {
          await trans.table('mesas').bulkAdd(Array.from(mesasCriadas.values()));
        }

        const lugares: Lugar[] = [];
        for (const mesa of mesasCriadas.values()) {
          for (let numeroPosicao = 1; numeroPosicao <= 24; numeroPosicao++) {
            lugares.push({
              id: uuid(),
              mesaId: mesa.id,
              numeroPosicao,
              funcionarioId: null
            });
          }
        }

        const posicoesOcupadas = new Set<string>();
        for (const item of antigos) {
          const mesaNome = item.mesa?.trim();
          const posicao = item.posicao;
          if (!mesaNome || typeof posicao !== 'number' || posicao < 1 || posicao > 24) continue;
          const mesa = mesasCriadas.get(mesaNome);
          if (!mesa) continue;
          const chave = `${mesa.id}:${posicao}`;
          if (posicoesOcupadas.has(chave)) continue;
          posicoesOcupadas.add(chave);
          const lugar = lugares.find((l) => l.mesaId === mesa.id && l.numeroPosicao === posicao);
          if (lugar) {
            lugar.funcionarioId = item.id;
          }
        }

        if (lugares.length > 0) {
          await trans.table('lugares').bulkAdd(lugares);
        }
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
