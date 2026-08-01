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

const REGEX_REGISTRO = /^\s*(?:\d{1,2}\s+)?(\d{4,8})\s+([A-ZÀ-Ÿ0-9.'\- ]+?)\s+(\d{1,3}[.,]\d{1,2})\s*%(?:\s*(?:R\$|\$)\s*(\d{1,3}(?:\.\d{3})*[.,]\d{1,2}))?/gi;
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

const SUBSTITUICOES_OCR_MATRICULA: Record<string, readonly string[]> = {
  A: ['3', '4'],
  B: ['8'],
  C: ['0'],
  D: ['0'],
  G: ['6'],
  I: ['1'],
  L: ['1'],
  N: ['1', '11'],
  O: ['0'],
  Q: ['0'],
  S: ['5'],
  Z: ['2']
};

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

function normalizarMatriculaBruta(texto: string): string {
  const bruto = texto.trim().toUpperCase();
  let caracteres = bruto.replace(/[^A-Z0-9]/g, '');
  for (const [letra, substitutos] of Object.entries(SUBSTITUICOES_OCR_MATRICULA)) {
    const substituto = substitutos[0] ?? '';
    caracteres = caracteres.replace(new RegExp(letra, 'g'), substituto);
  }
  return caracteres;
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
  if (registroFallback.registroValido) {
    return [registroFallback];
  }

  return [parsearLinhaOcrPorTokens(linha)];
}

function parsearLinhaOcrPorTokens(linha: LinhaOcrBruta): RegistroOcrParseado {
  const texto = limparTextoOcr(linha.texto);
  const textoSemPosicao = texto.replace(/^\d{1,2}\s+/, '');
  const tokens = textoSemPosicao.split(/\s+/).filter(Boolean);
  const percentualIndex = tokens.findIndex((token) => /^(\d{1,3}[.,]\d{1,2})%$/.test(token));
  const matriculaIndex = tokens.findIndex((token) => /^\d{4,8}$/.test(token));

  const nomeTokens = percentualIndex >= 0
    ? tokens.slice(0, percentualIndex).filter((_, idx) => idx !== matriculaIndex)
    : [];

  const nomeBruto = nomeTokens.join(' ') || null;
  const matriculaBruta = matriculaIndex >= 0 ? tokens[matriculaIndex] : null;
  const percentualBruto = percentualIndex >= 0 ? tokens[percentualIndex]!.replace('%', '') : null;

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

function parsearLinhaOcrFallback(linha: LinhaOcrBruta): RegistroOcrParseado {
  const texto = limparTextoOcr(linha.texto);
  const fallbackRegexes = [
    // Registro com matrícula no início da linha
    /(?:^|\s)(\d{4,8})\s+([A-ZÀ-Ÿ][A-ZÀ-Ÿ0-9 .'\-]{1,}?)\s+(\d{1,3}[.,]\d{1,2})\s*%/,
    // Registros onde pode haver número de posição antes do nome, ignorar se a primeira parte for curto demais
    /(?:^|\s)\d{1,2}\s+([A-ZÀ-Ÿ][A-ZÀ-Ÿ0-9 .'\-]{1,}?)(?:\s+(\d{4,8}))?\s+(\d{1,3}[.,]\d{1,2})\s*%/
  ];

  let matriculaBruta: string | null = null;
  let nomeBruto: string | null = null;
  let percentualBruto: string | null = null;

  for (const regex of fallbackRegexes) {
    const match = regex.exec(texto);
    if (!match) continue;

    if (regex === fallbackRegexes[0]) {
      matriculaBruta = match[1] ?? null;
      nomeBruto = match[2] ?? null;
      percentualBruto = match[3] ?? null;
    } else {
      nomeBruto = match[1] ?? null;
      matriculaBruta = match[2] ?? null;
      percentualBruto = match[3] ?? null;
    }

    if (matriculaBruta && nomeBruto && percentualBruto) break;
  }

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

function ehLinhaContinuacao(linha: LinhaOcrBruta): boolean {
  const texto = linha.texto.trim();
  return /^[A-ZÀ-Ÿ][A-ZÀ-Ÿ ]*$/.test(texto) && !/\d/.test(texto);
}

function obterCentroY(linha: LinhaOcrBruta): number {
  return linha.boundingBox.y + linha.boundingBox.altura / 2;
}

function overlapHorizontalGrupo(a: Grupo, linha: LinhaOcrBruta): boolean {
  return linha.boundingBox.x <= a.maxX + 20 && linha.boundingBox.x + linha.boundingBox.largura >= a.minX - 20;
}

function extrairMatriculaLegivel(texto: string): string | null {
  const textoNormalizado = limparTextoOcr(texto);
  const match = textoNormalizado.match(/\b(\d{4,8})\b/);
  return match?.[1] ?? null;
}

function ehLinhaMatricula(linha: LinhaOcrBruta): boolean {
  return extrairMatriculaLegivel(linha.texto) !== null || extrairMatriculaPorTokens(linha.texto) !== null;
}

function extrairMatriculaPorTokens(texto: string): string | null {
  const palavras = limparTextoOcr(texto).split(' ').filter(Boolean);
  for (const palavra of palavras) {
    const normalizada = normalizarMatriculaBruta(palavra);
    if (/^\d{4,8}$/.test(normalizada)) {
      return normalizada;
    }
  }
  return null;
}

type Grupo = {
  linhas: LinhaOcrBruta[];
  minY: number;
  maxY: number;
  minX: number;
  maxX: number;
};

function criarGrupoInicial(linha: LinhaOcrBruta): Grupo {
  return {
    linhas: [linha],
    minY: linha.boundingBox.y,
    maxY: linha.boundingBox.y + linha.boundingBox.altura,
    minX: linha.boundingBox.x,
    maxX: linha.boundingBox.x + linha.boundingBox.largura
  };
}

export function agruparLinhasBrutas(linhas: LinhaOcrBruta[]): LinhaOcrBruta[] {
  const linhasOrdenadas = [...linhas].sort((a, b) => {
    const dy = a.boundingBox.y - b.boundingBox.y;
    if (Math.abs(dy) > 18) return dy;
    return a.boundingBox.x - b.boundingBox.x;
  });

  const grupos: Grupo[] = [];
  const pendentes: LinhaOcrBruta[] = [];

  for (const linha of linhasOrdenadas) {
    if (ehLinhaMatricula(linha)) {
      grupos.push(criarGrupoInicial(linha));
      continue;
    }

    pendentes.push(linha);
  }

  for (const linha of pendentes) {
    const centroY = obterCentroY(linha);
    const candidatos = grupos.filter((grupo) => {
      const grupoCentroY = (grupo.minY + grupo.maxY) / 2;
      const deltaCentro = Math.abs(grupoCentroY - centroY);
      const deltaAbaixo = linha.boundingBox.y - grupo.maxY;
      const temMatricula = ehLinhaMatricula(linha);
      const temPercentual = containsPercentual(linha.texto);
      const ePosicaoLista = /^\s*\d{1,2}\s*$/.test(linha.texto) && !temMatricula && !temPercentual;

      if (deltaCentro <= 24 && overlapHorizontalGrupo(grupo, linha)) {
        if (ePosicaoLista) return false;
        return true;
      }

      if (ehLinhaContinuacao(linha) && deltaAbaixo > 0 && deltaAbaixo <= 60) {
        return overlapHorizontalGrupo(grupo, linha) || linha.boundingBox.x >= grupo.minX - 20;
      }

      return false;
    });

    if (candidatos.length === 0) {
      grupos.push(criarGrupoInicial(linha));
      continue;
    }

    const melhorGrupo = candidatos.reduce((melhor, grupo) => {
      const melhorCentro = (melhor.minY + melhor.maxY) / 2;
      const grupoCentro = (grupo.minY + grupo.maxY) / 2;
      return Math.abs(grupoCentro - centroY) < Math.abs(melhorCentro - centroY) ? grupo : melhor;
    }, candidatos[0] as Grupo);

    melhorGrupo.linhas.push(linha);
    melhorGrupo.minY = Math.min(melhorGrupo.minY, linha.boundingBox.y);
    melhorGrupo.maxY = Math.max(melhorGrupo.maxY, linha.boundingBox.y + linha.boundingBox.altura);
    melhorGrupo.minX = Math.min(melhorGrupo.minX, linha.boundingBox.x);
    melhorGrupo.maxX = Math.max(melhorGrupo.maxX, linha.boundingBox.x + linha.boundingBox.largura);
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

function containsMatricula(texto: string): boolean {
  return /\b\d{4,8}\b/.test(limparTextoOcr(texto));
}

function containsPercentual(texto: string): boolean {
  return /\d{1,3}[.,]\d{1,2}%/.test(limparTextoOcr(texto));
}

function overlapHorizontal(a: LinhaOcrBruta, b: LinhaOcrBruta): boolean {
  return b.boundingBox.x <= a.boundingBox.x + a.boundingBox.largura + 40 &&
    a.boundingBox.x <= b.boundingBox.x + b.boundingBox.largura + 40;
}

function combinarLinhasBrutas(a: LinhaOcrBruta, b: LinhaOcrBruta): LinhaOcrBruta {
  const x = Math.min(a.boundingBox.x, b.boundingBox.x);
  const y = Math.min(a.boundingBox.y, b.boundingBox.y);
  const largura = Math.max(a.boundingBox.x + a.boundingBox.largura, b.boundingBox.x + b.boundingBox.largura) - x;
  const altura = Math.max(a.boundingBox.y + a.boundingBox.altura, b.boundingBox.y + b.boundingBox.altura) - y;
  return {
    texto: [a.texto.trim(), b.texto.trim()].filter(Boolean).join(' '),
    boundingBox: { x, y, largura, altura },
    confidence: (a.confidence + b.confidence) / 2
  };
}

function ehCandidatoMerge(a: LinhaOcrBruta, b: LinhaOcrBruta): boolean {
  const proximos = Math.abs((a.boundingBox.y + a.boundingBox.altura / 2) - (b.boundingBox.y + b.boundingBox.altura / 2));
  if (proximos > 90) return false;
  if (!overlapHorizontal(a, b)) return false;
  const aTemMatricula = containsMatricula(a.texto);
  const bTemMatricula = containsMatricula(b.texto);
  const aTemPercentual = containsPercentual(a.texto);
  const bTemPercentual = containsPercentual(b.texto);
  if ((aTemMatricula && bTemPercentual) || (bTemMatricula && aTemPercentual)) {
    return true;
  }
  if (aTemMatricula && !aTemPercentual && !bTemMatricula && bTemPercentual) {
    return true;
  }
  if (bTemMatricula && !bTemPercentual && !aTemMatricula && aTemPercentual) {
    return true;
  }
  return false;
}

export function parsearLinhasOcr(linhas: LinhaOcrBruta[]): {
  registros: Array<LinhaOcrParseada & { matricula: string; percentual: number }>;
  debug: RegistroOcrParseado[];
} {
  const linhasNormalizadas = agruparLinhasBrutas(linhas);
  const registrosBrutos = [...linhasNormalizadas.flatMap(parsearLinhaPorRegex)];

  for (let i = 0; i < linhasNormalizadas.length - 1; i += 1) {
    const atual = linhasNormalizadas[i]!;
    const proximo = linhasNormalizadas[i + 1]!;
    if (!ehCandidatoMerge(atual, proximo)) continue;

    const combinado = combinarLinhasBrutas(atual, proximo);
    registrosBrutos.push(...parsearLinhaPorRegex(combinado));
  }

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
