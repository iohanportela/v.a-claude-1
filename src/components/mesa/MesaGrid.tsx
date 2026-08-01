import clsx from 'clsx';
import type { MapaMesaPosicao } from '@domain/domain';

export type ModoMesaGrid = 'padrao' | 'pendencia';

interface MesaGridProps {
  layout: readonly number[][];
  mapa: MapaMesaPosicao[];
  onSelecionarPosicao: (posicao: number) => void;
  /**
   * 'padrao': ocupados mostram nome em cinza, vazios mostram número.
   * 'pendencia': ocupados ficam vermelhos, vazios ficam verdes
   * (usado no modal de funcionário novo do OCR).
   */
  modo?: ModoMesaGrid;
  posicaoDestacada?: number | null;
}

export function MesaGrid({
  layout,
  mapa,
  onSelecionarPosicao,
  modo = 'padrao',
  posicaoDestacada = null
}: MesaGridProps): JSX.Element {
  const porPosicao = new Map(mapa.map((item) => [item.posicao, item]));

  return (
    <div className="flex flex-col gap-2">
      {layout.map((fileira, indiceFileira) => (
        <div key={indiceFileira} className="grid grid-cols-12 gap-1.5">
          {fileira.map((posicao) => {
            const item = porPosicao.get(posicao);
            const ocupada = item?.ocupada ?? false;
            const destacada = posicaoDestacada === posicao;

            return (
              <button
                key={posicao}
                type="button"
                onClick={() => onSelecionarPosicao(posicao)}
                className={clsx(
                  'flex aspect-square min-h-[2.75rem] flex-col items-center justify-center rounded-lg border p-0.5 text-center transition-transform active:scale-95',
                  destacada && 'ring-2 ring-accent-400',
                  modo === 'padrao' &&
                    (ocupada
                      ? 'border-base-700 bg-base-800 text-base-100'
                      : 'border-dashed border-base-600 bg-base-900 text-base-400'),
                  modo === 'pendencia' &&
                    (ocupada
                      ? 'border-danger-500 bg-danger-500/20 text-danger-300'
                      : 'border-success-500 bg-success-500/20 text-success-300')
                )}
              >
                <span className="text-[0.6rem] font-bold leading-none opacity-70">{posicao}</span>
                {ocupada && item?.funcionario ? (
                  <span className="line-clamp-1 text-[0.6rem] font-medium leading-tight">
                    {primeiroNome(item.funcionario.nome)}
                  </span>
                ) : null}
              </button>
            );
          })}
        </div>
      ))}
    </div>
  );
}

function primeiroNome(nomeCompleto: string): string {
  return nomeCompleto.split(' ')[0] ?? nomeCompleto;
}
