import type { LinhaOcrBruta, LinhaOcrParseada } from '@domain/domain';

/**
 * Regras de parsing das linhas do sistema da empresa. O layout esperado
 * por linha é: MATRÍCULA  NOME  PERCENTUAL%  VALOR
 * Exemplo real de texto OCR: "00123  ANDERSON SILVA  118,4%  R$ 342,10"
 *
 * O OCR é ruidoso (fontes pequenas, compressão de tela), então os regex
 * são tolerantes a variações comuns: espaços múltiplos, vírgula ou ponto
 * decimal, "%" colado ou separado, "R$" opcional.
 */

const REGEX_REGISTRO = /(?:^\s*\d{1,2}\s+)?(\d{4,8})\s+([A-ZÀ-Ÿ0-9.'\- ]+?)\s+(\d{1,3}[.,]\d{1,2})\s*%(?:\s*(?:R\$|\$)\s*(\d{1,3}(?:\.\d{3})*[.,]\d{1,2}))?/gi;
const REGEX_VALOR = /(?:R\$|\$)\s*(\d{1,3}(?:\.\d{3})*[.,]\d{1,2})(?!\s*%)/;

function limparTextoOcr(texto: string): string {
  return texto
    .toUpperCase()
    .replace(/[\[\]\(\)\{\}|_/\\]/g, ' ')
    .replace(/\|+/g, ' ')
    .replace(/R\$\s*DES/g, 'R$')
    .replace(/\bNS\b/g, ' ')
    .replace(/\bDES\b/g, ' ')
    .replace(/\s*([.,%$])\s*/g, '$1')
    .replace(/[^A-ZÀ-Ÿ0-9$%.,'\- ]+/g, ' ')
    .replace(/\s{2,}/g, ' ')
    .trim();
}

/**
 * Caracteres frequentemente confundidos pelo OCR em dígitos, usados para
 * normalizar a matrícula antes de comparar com o banco.
 */
const SUBSTITUICOES_OCR: ReadonlyArray<[RegExp, string]> = [
  [/O/g, '0'],
  [/o/g, '0'],
  [/I/g, '1'],
  [/l/g, '1'],
  [/S/g, '5']
];

export function normalizarNumeroDecimal(texto: string): number {
  return Number.parseFloat(texto.replace(/\./g, '').replace(',', '.'));
}

/**
 * Aplica correções de dígitos comumente confundidos, só quando a região
 * parecer numérica.
 */
export function normalizarMatriculaOcr(bruta: string): string {
  let resultado = bruta;
  for (const [padrao, substituto] of SUBSTITUICOES_OCR) {
    resultado = resultado.replace(padrao, substituto);
  }
  return resultado.replace(/\D/g, '');
}

function extrairValor(texto: string): number | null {
  const match = REGEX_VALOR.exec(texto);
  if (!match?.[1]) return null;
  const valor = normalizarNumeroDecimal(match[1]);
  return Number.isFinite(valor) ? valor : null;
}

function normalizarNomeBruto(texto: string): string {
  return texto
    .replace(/[|_/\\]/g, ' ')
    .replace(/\s{2,}/g, ' ')
    .trim()
    .toUpperCase();
}

export interface RegistroOcrParseado extends LinhaOcrParseada {
  registroValido: boolean;
  motivoDescartado: string | null;
  textoBruto: string;
}

function criarRegistroAPartirMatch(
  match: RegExpMatchArray,
  linha: LinhaOcrBruta,
  textoBruto: string
): RegistroOcrParseado {
  const matriculaBruta = match[1] ?? null;
  const nomeBruto = match[2] ?? null;
  const percentualBruto = match[3] ?? null;
  const valorBruto = match[4] ?? null;

  const matricula = matriculaBruta ? normalizarMatriculaOcr(matriculaBruta) : null;
  const percentual = percentualBruto ? normalizarNumeroDecimal(percentualBruto) : null;
  const valor = valorBruto ? normalizarValorBruto(valorBruto) : null;
  const nome = nomeBruto ? normalizarNomeBruto(nomeBruto) : null;

  const motivoDescartado = !matricula || !nome || percentual === null
    ? !matricula
      ? 'Matrícula inválida ou ausente'
      : !nome
      ? 'Nome inválido ou ausente'
      : 'Percentual inválido ou ausente'
    : null;

  return {
    matricula: matricula && matricula.length > 0 ? matricula : null,
    nome,
    percentual,
    valor,
    boundingBox: linha.boundingBox,
    confidence: linha.confidence,
    brutaOriginal: textoBruto,
    registroValido: motivoDescartado === null,
    motivoDescartado,
    textoBruto
  };
}

function normalizarValorBruto(texto: string): number | null {
  const match = /R?\$?\s*(\d{1,3}(?:\.\d{3})*[.,]\d{1,2})/.exec(texto);
  if (!match?.[1]) return null;
  const valor = normalizarNumeroDecimal(match[1]);
  return Number.isFinite(valor) ? valor : null;
}

function parsearLinhaPorRegex(linha: LinhaOcrBruta): RegistroOcrParseado[] {
  const texto = limparTextoOcr(linha.texto);
  const registros: RegistroOcrParseado[] = [];
  const matches = [...texto.matchAll(REGEX_REGISTRO)];

  for (const match of matches) {
    registros.push(criarRegistroAPartirMatch(match, linha, match[0]));
  }

  if (registros.length > 0) {
    return registros;
  }

  const registroFallback = parsearLinhaOcrFallback({ ...linha, texto });
  return [registroFallback];
}

function parsearLinhaOcrFallback(linha: LinhaOcrBruta): RegistroOcrParseado {
  const texto = limparTextoOcr(linha.texto);
  const match = /(?:^|\s)(\d{2,8})\s+([A-ZÀ-Ÿ][A-ZÀ-Ÿ0-9 .'\-]{1,}?)\s+(\d{1,3}[.,]\d{1,2})\s*%/.exec(texto);
  const matriculaBruta = match?.[1] ?? null;
  const nomeBruto = match?.[2] ?? null;
  const percentualBruto = match?.[3] ?? null;

  const matricula = matriculaBruta ? normalizarMatriculaOcr(matriculaBruta) : null;
  const percentual = percentualBruto ? normalizarNumeroDecimal(percentualBruto) : null;
  const nome = nomeBruto ? normalizarNomeBruto(nomeBruto) : null;
  const valor = extrairValor(texto);

  const motivoDescartado = !matricula || !nome || percentual === null
    ? !matricula
      ? 'Matrícula inválida ou ausente'
      : !nome
      ? 'Nome inválido ou ausente'
      : 'Percentual inválido ou ausente'
    : null;

  return {
    matricula: matricula && matricula.length > 0 ? matricula : null,
    nome,
    percentual,
    valor,
    boundingBox: linha.boundingBox,
    confidence: linha.confidence,
    brutaOriginal: texto,
    registroValido: motivoDescartado === null,
    motivoDescartado,
    textoBruto: texto
  };
}

function agruparLinhasBrutas(linhas: LinhaOcrBruta[]): LinhaOcrBruta[] {
  const linhasOrdenadas = [...linhas].sort((a, b) => {
    const dy = a.boundingBox.y - b.boundingBox.y;
    if (Math.abs(dy) > 18) return dy;
    return a.boundingBox.x - b.boundingBox.x;
  });

  type Grupo = {
    linhas: LinhaOcrBruta[];
    minY: number;
    maxY: number;
    minX: number;
    maxX: number;
  };

  const grupos: Grupo[] = [];

  function ehLinhaContinuacao(linha: LinhaOcrBruta): boolean {
    const texto = linha.texto.trim();
    return /^[A-ZÀ-Ÿ][A-ZÀ-Ÿ ]*$/.test(texto) && !/\d/.test(texto);
  }

  function overlapHorizontal(a: Grupo, linha: LinhaOcrBruta): boolean {
    return linha.boundingBox.x <= a.maxX + 20 && linha.boundingBox.x + linha.boundingBox.largura >= a.minX - 20;
  }

  for (const linha of linhasOrdenadas) {
    const centroY = linha.boundingBox.y + linha.boundingBox.altura / 2;
    let grupo = grupos.find((g) => {
      const grupoCentro = (g.minY + g.maxY) / 2;
      if (Math.abs(grupoCentro - centroY) <= 18) {
        return true;
      }
      if (ehLinhaContinuacao(linha) && linha.boundingBox.y >= g.maxY && linha.boundingBox.y - g.maxY <= 30) {
        return overlapHorizontal(g, linha);
      }
      return false;
    });

    if (!grupo) {
      grupo = {
        linhas: [linha],
        minY: linha.boundingBox.y,
        maxY: linha.boundingBox.y + linha.boundingBox.altura,
        minX: linha.boundingBox.x,
        maxX: linha.boundingBox.x + linha.boundingBox.largura
      };
      grupos.push(grupo);
      continue;
    }

    grupo.linhas.push(linha);
    grupo.minY = Math.min(grupo.minY, linha.boundingBox.y);
    grupo.maxY = Math.max(grupo.maxY, linha.boundingBox.y + linha.boundingBox.altura);
    grupo.minX = Math.min(grupo.minX, linha.boundingBox.x);
    grupo.maxX = Math.max(grupo.maxX, linha.boundingBox.x + linha.boundingBox.largura);
  }

  return grupos.map((grupo) => {
    const partes = grupo.linhas.sort((a, b) => a.boundingBox.x - b.boundingBox.x);
    const texto = partes.map((parte) => parte.texto.trim()).filter(Boolean).join(' ');
    const boundingBox = {
      x: Math.min(...partes.map((parte) => parte.boundingBox.x)),
      y: grupo.minY,
      largura: Math.max(...partes.map((parte) => parte.boundingBox.x + parte.boundingBox.largura)) - Math.min(...partes.map((parte) => parte.boundingBox.x)),
      altura: grupo.maxY - grupo.minY
    };
    const confidence = partes.reduce((soma, parte) => soma + parte.confidence, 0) / partes.length;
    return { texto, boundingBox, confidence };
  });
}

export function parsearLinhasOcr(linhas: LinhaOcrBruta[]): {
  registros: Array<LinhaOcrParseada & { matricula: string; percentual: number }>;
  debug: RegistroOcrParseado[];
} {
  const linhasNormalizadas = agruparLinhasBrutas(linhas);
  const registrosBrutos = linhasNormalizadas.flatMap(parsearLinhaPorRegex);
  const registrosUnicos = Array.from(
    new Map(registrosBrutos.map((registro) => [registro.textoBruto + '|' + registro.matricula, registro])).values()
  );

  const registrosValidos = registrosUnicos.filter(
    (registro): registro is RegistroOcrParseado & { matricula: string; percentual: number } =>
      registro.registroValido && registro.matricula !== null && registro.percentual !== null
  );

  return { registros: registrosValidos, debug: registrosUnicos };
}

export function parsearLinhasValidas(
  linhas: LinhaOcrBruta[]
): Array<LinhaOcrParseada & { matricula: string; percentual: number }> {
  return parsearLinhasOcr(linhas).registros;
}
