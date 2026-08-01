import type { BoundingBox, Palavra } from '@domain/domain';

/**
 * Dada uma palavra (ex.: a que bateu numa busca) e todas as palavras da
 * mesma imagem, identifica quais outras pertencem à mesma linha visual —
 * usando a proximidade do centro vertical (eixo Y) de cada bounding box —
 * e devolve um único retângulo que envolve a linha inteira, junto com o
 * texto reconstruído em ordem da esquerda para a direita.
 *
 * Não depende de qual "linha" o motor de OCR originalmente detectou:
 * funciona só a partir das bounding boxes já salvas, então continua
 * funcionando mesmo que o OCR tenha fragmentado a linha de forma
 * diferente do esperado.
 */
export function encontrarLinhaCompleta(
  palavraAlvo: Palavra,
  todasPalavras: Palavra[]
): { boundingBox: BoundingBox; texto: string; palavras: Palavra[] } {
  const centroYAlvo = centroVertical(palavraAlvo.boundingBox);

  // Tolerância proporcional à altura da própria palavra-alvo: linhas de
  // texto costumam ter todas as palavras com altura parecida, então uma
  // fração dessa altura é um limiar razoável para "mesma linha".
  const tolerancia = Math.max(palavraAlvo.boundingBox.altura * 0.6, 6);

  const palavrasDaLinha = todasPalavras
    .filter((p) => p.imagemId === palavraAlvo.imagemId)
    .filter((p) => Math.abs(centroVertical(p.boundingBox) - centroYAlvo) <= tolerancia)
    .sort((a, b) => a.boundingBox.x - b.boundingBox.x);

  // Garante que a própria palavra-alvo sempre está incluída, mesmo em
  // casos-limite de arredondamento.
  if (!palavrasDaLinha.some((p) => p.id === palavraAlvo.id)) {
    palavrasDaLinha.push(palavraAlvo);
    palavrasDaLinha.sort((a, b) => a.boundingBox.x - b.boundingBox.x);
  }

  const boundingBox = unirBoundingBoxes(palavrasDaLinha.map((p) => p.boundingBox));
  const texto = palavrasDaLinha.map((p) => p.texto).join(' ');

  return { boundingBox, texto, palavras: palavrasDaLinha };
}

function centroVertical(box: BoundingBox): number {
  return box.y + box.altura / 2;
}

function unirBoundingBoxes(boxes: BoundingBox[]): BoundingBox {
  const minX = Math.min(...boxes.map((b) => b.x));
  const minY = Math.min(...boxes.map((b) => b.y));
  const maxX = Math.max(...boxes.map((b) => b.x + b.largura));
  const maxY = Math.max(...boxes.map((b) => b.y + b.altura));
  return { x: minX, y: minY, largura: maxX - minX, altura: maxY - minY };
}
