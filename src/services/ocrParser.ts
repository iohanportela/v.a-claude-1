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

const REGEX_MATRICULA = /^\D*(\d{2,8})\b/;
const REGEX_PERCENTUAL = /(\d{1,3}[.,]\d{1,2})\s*%/;
const REGEX_VALOR = /R?\$?\s*(\d{1,3}(?:\.\d{3})*[.,]\d{2})(?!\s*%)/;

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

function extrairMatricula(texto: string): string | null {
  const match = REGEX_MATRICULA.exec(texto.trim());
  return match?.[1] ?? null;
}

/** Aplica correções de dígitos comumente confundidos, só quando a região parecer numérica. */
export function normalizarMatriculaOcr(bruta: string): string {
  let resultado = bruta;
  for (const [padrao, substituto] of SUBSTITUICOES_OCR) {
    resultado = resultado.replace(padrao, substituto);
  }
  return resultado.replace(/\D/g, '');
}

function extrairPercentual(texto: string): number | null {
  const match = REGEX_PERCENTUAL.exec(texto);
  if (!match?.[1]) return null;
  const valor = normalizarNumeroDecimal(match[1]);
  return Number.isFinite(valor) ? valor : null;
}

function extrairValor(texto: string): number | null {
  const match = REGEX_VALOR.exec(texto);
  if (!match?.[1]) return null;
  const valor = normalizarNumeroDecimal(match[1]);
  return Number.isFinite(valor) ? valor : null;
}

/**
 * Extrai o nome como o trecho de texto entre a matrícula e o percentual,
 * removendo pontuação sobressalente do OCR.
 */
function extrairNome(texto: string, matricula: string | null, percentualBruto: string | null): string | null {
  let resto = texto;

  if (matricula) {
    const idx = resto.indexOf(matricula);
    if (idx >= 0) {
      resto = resto.slice(idx + matricula.length);
    }
  }

  if (percentualBruto) {
    const idx = resto.indexOf(percentualBruto);
    if (idx >= 0) {
      resto = resto.slice(0, idx);
    }
  }

  const nome = resto
    .replace(/[|_/\\]/g, ' ')
    .replace(/\s{2,}/g, ' ')
    .trim();

  return nome.length >= 2 ? nome.toUpperCase() : null;
}

export function parsearLinhaOcr(linha: LinhaOcrBruta): LinhaOcrParseada {
  const texto = linha.texto;

  const matriculaBruta = extrairMatricula(texto);
  const matricula = matriculaBruta ? normalizarMatriculaOcr(matriculaBruta) : null;

  const percentualMatch = REGEX_PERCENTUAL.exec(texto);
  const percentual = extrairPercentual(texto);
  const valor = extrairValor(texto);
  const nome = extrairNome(texto, matriculaBruta, percentualMatch?.[0] ?? null);

  return {
    matricula: matricula && matricula.length > 0 ? matricula : null,
    nome,
    percentual,
    valor,
    boundingBox: linha.boundingBox,
    confidence: linha.confidence,
    brutaOriginal: texto
  };
}

/**
 * Filtra apenas as linhas que contêm o mínimo necessário para virar uma
 * leitura válida (matrícula + percentual). Linhas de cabeçalho, rodapé
 * ou ruído do OCR são descartadas aqui.
 */
export function parsearLinhasValidas(
  linhas: LinhaOcrBruta[]
): Array<LinhaOcrParseada & { matricula: string; percentual: number }> {
  return linhas
    .map(parsearLinhaOcr)
    .filter((l): l is LinhaOcrParseada & { matricula: string; percentual: number } =>
      l.matricula !== null && l.percentual !== null
    );
}
