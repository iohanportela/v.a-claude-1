import { useEffect, useLayoutEffect, useRef } from 'react';
import type { BoundingBox } from '@domain/domain';

interface VisualizadorZoomProps {
  src: string;
  largura: number;
  altura: number;
  /** Retângulo a destacar (ex.: a linha inteira do resultado pesquisado). Null = sem destaque. */
  destaque: BoundingBox | null;
}

const ESCALA_MIN = 0.5;
const ESCALA_MAX = 4;

/**
 * Visualizador de imagem com zoom e arraste controlados por ponteiro
 * (mouse, touch e caneta são todos "pointer events" — cobre arrastar com
 * o dedo e pinçar para dar zoom no celular, e roda do mouse no desktop).
 * O destaque é um `<div>` posicionado nas mesmas coordenadas de pixel da
 * imagem original, dentro do mesmo contêiner transformado — por isso ele
 * acompanha automaticamente o zoom/arraste sem nenhum cálculo extra.
 * O escurecimento do resto da imagem usa um truque de `box-shadow` com
 * espalhamento enorme, em vez de canvas.
 */
export function VisualizadorZoom({ src, largura, altura, destaque }: VisualizadorZoomProps): JSX.Element {
  const containerRef = useRef<HTMLDivElement>(null);
  const transformRef = useRef<HTMLDivElement>(null);
  const estado = useRef({ escala: 1, x: 0, y: 0 });
  const ponteiros = useRef(new Map<number, { x: number; y: number }>());
  const pinca = useRef<{ distancia: number; escala: number } | null>(null);
  const arrasto = useRef<{ x: number; y: number; panX: number; panY: number } | null>(null);

  function aplicarTransform(): void {
    const alvo = transformRef.current;
    if (!alvo) return;
    const { escala, x, y } = estado.current;
    alvo.style.transform = `translate(${x}px, ${y}px) scale(${escala})`;
  }

  function ajustarParaCaber(): void {
    const container = containerRef.current;
    if (!container || largura === 0 || altura === 0) return;

    const { width: cw, height: ch } = container.getBoundingClientRect();
    const escala = Math.min(cw / largura, ch / altura) * 0.96;
    const x = (cw - largura * escala) / 2;
    const y = (ch - altura * escala) / 2;

    estado.current = { escala, x, y };
    aplicarTransform();
  }

  function centralizarEm(box: BoundingBox): void {
    const container = containerRef.current;
    if (!container) return;

    const { width: cw, height: ch } = container.getBoundingClientRect();
    const escalaCaber = Math.min(cw / largura, ch / altura);

    const escalaHorizontal = box.largura > 0 ? (cw * 0.7) / box.largura : ESCALA_MAX;
    const escalaVertical = box.altura > 0 ? (ch * 0.5) / box.altura : ESCALA_MAX;
    const escalaFoco = Math.min(escalaHorizontal, escalaVertical);
    const escala = Math.min(ESCALA_MAX, Math.max(escalaCaber, Math.min(escalaFoco, escalaCaber * 1.4)));

    const cx = box.x + box.largura / 2;
    const cy = box.y + box.altura / 2;

    estado.current = {
      escala,
      x: cw / 2 - cx * escala,
      y: ch / 2 - cy * escala
    };
    aplicarTransform();
  }

  useLayoutEffect(() => {
    ajustarParaCaber();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [largura, altura]);

  useEffect(() => {
    if (destaque) {
      centralizarEm(destaque);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [destaque]);

  function distanciaEntre(a: { x: number; y: number }, b: { x: number; y: number }): number {
    return Math.hypot(a.x - b.x, a.y - b.y);
  }

  function lidarComPointerDown(evento: React.PointerEvent<HTMLDivElement>): void {
    evento.currentTarget.setPointerCapture(evento.pointerId);
    ponteiros.current.set(evento.pointerId, { x: evento.clientX, y: evento.clientY });

    if (ponteiros.current.size === 1) {
      arrasto.current = {
        x: evento.clientX,
        y: evento.clientY,
        panX: estado.current.x,
        panY: estado.current.y
      };
    } else if (ponteiros.current.size === 2) {
      arrasto.current = null;
      const pontos = Array.from(ponteiros.current.values());
      const p0 = pontos[0];
      const p1 = pontos[1];
      if (p0 && p1) {
        pinca.current = { distancia: distanciaEntre(p0, p1), escala: estado.current.escala };
      }
    }
  }

  function lidarComPointerMove(evento: React.PointerEvent<HTMLDivElement>): void {
    if (!ponteiros.current.has(evento.pointerId)) return;
    ponteiros.current.set(evento.pointerId, { x: evento.clientX, y: evento.clientY });

    if (ponteiros.current.size === 2 && pinca.current) {
      const pontos = Array.from(ponteiros.current.values());
      const p0 = pontos[0];
      const p1 = pontos[1];
      if (!p0 || !p1) return;

      const novaDistancia = distanciaEntre(p0, p1);
      const fator = novaDistancia / pinca.current.distancia;
      const novaEscala = Math.min(ESCALA_MAX, Math.max(ESCALA_MIN, pinca.current.escala * fator));
      estado.current = { ...estado.current, escala: novaEscala };
      aplicarTransform();
      return;
    }

    if (ponteiros.current.size === 1 && arrasto.current) {
      const dx = evento.clientX - arrasto.current.x;
      const dy = evento.clientY - arrasto.current.y;
      estado.current = {
        ...estado.current,
        x: arrasto.current.panX + dx,
        y: arrasto.current.panY + dy
      };
      aplicarTransform();
    }
  }

  function lidarComPointerUp(evento: React.PointerEvent<HTMLDivElement>): void {
    ponteiros.current.delete(evento.pointerId);
    if (ponteiros.current.size < 2) {
      pinca.current = null;
    }
    if (ponteiros.current.size === 1) {
      const restante = Array.from(ponteiros.current.values())[0];
      if (restante) {
        arrasto.current = {
          x: restante.x,
          y: restante.y,
          panX: estado.current.x,
          panY: estado.current.y
        };
      }
    } else {
      arrasto.current = null;
    }
  }

  function lidarComRoda(evento: React.WheelEvent<HTMLDivElement>): void {
    evento.preventDefault();
    const container = containerRef.current;
    if (!container) return;

    const rect = container.getBoundingClientRect();
    const px = evento.clientX - rect.left;
    const py = evento.clientY - rect.top;

    const fator = evento.deltaY > 0 ? 0.9 : 1.1;
    const escalaAtual = estado.current.escala;
    const novaEscala = Math.min(ESCALA_MAX, Math.max(ESCALA_MIN, escalaAtual * fator));

    // Mantém o ponto sob o cursor fixo na tela enquanto dá zoom.
    const imgX = (px - estado.current.x) / escalaAtual;
    const imgY = (py - estado.current.y) / escalaAtual;

    estado.current = {
      escala: novaEscala,
      x: px - imgX * novaEscala,
      y: py - imgY * novaEscala
    };
    aplicarTransform();
  }

  return (
    <div
      ref={containerRef}
      className="relative h-full w-full touch-none overflow-hidden bg-black"
      onPointerDown={lidarComPointerDown}
      onPointerMove={lidarComPointerMove}
      onPointerUp={lidarComPointerUp}
      onPointerCancel={lidarComPointerUp}
      onWheel={lidarComRoda}
      onDoubleClick={ajustarParaCaber}
    >
      <div
        ref={transformRef}
        style={{
          position: 'absolute',
          left: 0,
          top: 0,
          width: largura,
          height: altura,
          transformOrigin: '0 0'
        }}
      >
        <img
          src={src}
          width={largura}
          height={altura}
          draggable={false}
          className="block max-w-none select-none"
          alt="Imagem importada"
        />

        {destaque ? (
          <div
            style={{
              position: 'absolute',
              left: destaque.x,
              top: destaque.y,
              width: destaque.largura,
              height: destaque.altura,
              boxShadow: '0 0 0 9999px rgba(0, 0, 0, 0.6)'
            }}
            className="rounded-md border-[3px] border-accent-400"
          />
        ) : null}
      </div>
    </div>
  );
}
