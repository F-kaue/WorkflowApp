/**
 * Sistema de cache para tickets gerados
 * 
 * Este módulo implementa um sistema de cache simples para armazenar tickets gerados
 * anteriormente, reduzindo a necessidade de chamar a API da OpenAI para solicitações
 * semelhantes e melhorando o desempenho geral do sistema.
 */

interface CachedTicket {
  sindicato: string;
  solicitacaoOriginal: string;
  ticket: string;
  timestamp: number;
}

// Cache em memória (será limpo quando o servidor for reiniciado)
let ticketCache: CachedTicket[] = [];

// Tamanho máximo do cache
const MAX_CACHE_SIZE = 50;

// Tempo de expiração do cache em milissegundos (24 horas)
const CACHE_EXPIRATION = 24 * 60 * 60 * 1000;

/**
 * Calcula a similaridade entre duas strings usando a distância de Levenshtein
 * @param a Primeira string
 * @param b Segunda string
 * @returns Valor de similaridade entre 0 e 1 (1 = idêntico)
 */
function calculateSimilarity(a: string, b: string): number {
  // Implementação simplificada da distância de Levenshtein
  const aLower = a.toLowerCase();
  const bLower = b.toLowerCase();
  
  // Se as strings são idênticas, retorna 1
  if (aLower === bLower) return 1;
  
  // Se uma das strings está contida na outra, retorna um valor alto
  if (aLower.includes(bLower) || bLower.includes(aLower)) {
    const longerLength = Math.max(aLower.length, bLower.length);
    const shorterLength = Math.min(aLower.length, bLower.length);
    return shorterLength / longerLength * 0.9; // 90% de similaridade
  }
  
  // Implementação simplificada para strings diferentes
  // Conta palavras em comum
  const aWords = new Set(aLower.split(/\s+/).filter(w => w.length > 3));
  const bWords = new Set(bLower.split(/\s+/).filter(w => w.length > 3));
  
  let commonWords = 0;
  for (const word of aWords) {
    if (bWords.has(word)) commonWords++;
  }
  
  const totalUniqueWords = aWords.size + bWords.size - commonWords;
  return totalUniqueWords > 0 ? commonWords / totalUniqueWords : 0;
}

/**
 * Busca um ticket no cache com base na similaridade
 * @param sindicato Nome do sindicato
 * @param solicitacaoOriginal Texto da solicitação
 * @param similarityThreshold Limiar de similaridade (0-1)
 * @returns Ticket encontrado ou null
 */
export function findSimilarTicket(
  sindicato: string,
  solicitacaoOriginal: string,
  similarityThreshold = 0.85
): string | null {
  // Limpar cache expirado
  const now = Date.now();
  ticketCache = ticketCache.filter(item => (now - item.timestamp) < CACHE_EXPIRATION);
  
  // Verificar correspondência exata do sindicato primeiro
  const sindicatoMatches = ticketCache.filter(item => 
    item.sindicato.toLowerCase() === sindicato.toLowerCase()
  );
  
  // Se não houver correspondências de sindicato, retorna null
  if (sindicatoMatches.length === 0) return null;
  
  // Encontrar a solicitação mais similar
  let bestMatch: CachedTicket | null = null;
  let highestSimilarity = 0;
  
  for (const item of sindicatoMatches) {
    const similarity = calculateSimilarity(item.solicitacaoOriginal, solicitacaoOriginal);
    if (similarity > highestSimilarity) {
      highestSimilarity = similarity;
      bestMatch = item;
    }
  }
  
  // Retornar o ticket se a similaridade estiver acima do limiar
  if (bestMatch && highestSimilarity >= similarityThreshold) {
    return bestMatch.ticket;
  }
  
  return null;
}

/**
 * Adiciona um ticket ao cache
 * @param sindicato Nome do sindicato
 * @param solicitacaoOriginal Texto da solicitação
 * @param ticket Conteúdo do ticket gerado
 */
export function cacheTicket(
  sindicato: string,
  solicitacaoOriginal: string,
  ticket: string
): void {
  // Limitar o tamanho do cache
  if (ticketCache.length >= MAX_CACHE_SIZE) {
    // Remover o item mais antigo
    ticketCache.sort((a, b) => a.timestamp - b.timestamp);
    ticketCache.shift();
  }
  
  // Adicionar novo item ao cache
  ticketCache.push({
    sindicato,
    solicitacaoOriginal,
    ticket,
    timestamp: Date.now()
  });
}

/**
 * Limpa o cache de tickets
 */
export function clearTicketCache(): void {
  ticketCache = [];
}

/**
 * Retorna estatísticas do cache
 */
export function getCacheStats() {
  const now = Date.now();
  const activeItems = ticketCache.filter(item => (now - item.timestamp) < CACHE_EXPIRATION);
  
  return {
    totalItems: ticketCache.length,
    activeItems: activeItems.length,
    expiredItems: ticketCache.length - activeItems.length,
    maxSize: MAX_CACHE_SIZE
  };
}