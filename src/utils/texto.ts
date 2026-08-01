/**
 * Normaliza texto para busca: minúsculo e sem acentuação, para que
 * pesquisar "joao" encontre "João" e "JOÃO" indistintamente.
 */
export function normalizarTexto(texto: string): string {
  return texto
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}
