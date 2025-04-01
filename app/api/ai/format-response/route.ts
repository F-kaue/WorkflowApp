import { NextResponse } from 'next/server';

type FormatRequestBody = {
  text: string;
};

type FormatResponse = {
  formattedText: string;
  errors?: string[];
};

export async function POST(request: Request) {
  try {
    // Validação da requisição
    if (!request.body) {
      return NextResponse.json(
        { error: 'Request body is missing' },
        { status: 400 }
      );
    }

    const { text } = (await request.json()) as FormatRequestBody;

    if (!text || typeof text !== 'string') {
      return NextResponse.json(
        { error: 'Invalid or missing text parameter' },
        { status: 400 }
      );
    }

    // Processamento do texto
    const result = formatText(text);

    // Resposta de sucesso
    return NextResponse.json({
      formattedText: result.formattedText,
      ...(result.errors && { warnings: result.errors })
    });

  } catch (error) {
    console.error('Error in text formatting:', error);
    return NextResponse.json(
      { error: 'Internal server error during text processing' },
      { status: 500 }
    );
  }
}

function formatText(rawText: string): FormatResponse {
  const errors: string[] = [];
  let formattedText = rawText;

  try {
    // 1. Normalização básica do texto
    formattedText = formattedText
      .replace(/\s+/g, ' ') // Remove múltiplos espaços
      .replace(/(\r\n|\n|\r)/gm, '\n') // Normaliza quebras de linha
      .trim();

    // 2. Correção de palavras coladas
    formattedText = fixJoinedWords(formattedText);

    // 3. Correção de termos específicos
    formattedText = fixSpecificTerms(formattedText);

    // 4. Formatação de listas e estrutura
    formattedText = formatLists(formattedText);

    // 5. Correção de pontuação
    formattedText = fixPunctuation(formattedText);

    // 6. Capitalização adequada
    formattedText = properCapitalization(formattedText);

    // 7. Limpeza final
    formattedText = formattedText
      .replace(/\n{3,}/g, '\n\n') // Máximo de 1 linha em branco
      .replace(/(\S)\n(\S)/g, '$1\n\n$2') // Espaço entre parágrafos
      .trim();

  } catch (error) {
    errors.push('Partial formatting applied due to processing error');
    console.error('Error during text formatting:', error);
  }

  return {
    formattedText,
    ...(errors.length > 0 && { errors })
  };
}

// Funções auxiliares específicas
function fixJoinedWords(text: string): string {
  const commonPrefixes = ['um', 'no', 'do', 'da', 'os', 'as', 'para', 'com', 'em', 'de', 'a', 'o', 'e', 'se', 'na', 'ao', 'nos'];
  const commonWords = ['boleto', 'sistema', 'siga', 'passos', 'acesse', 'módulo', 'clique', 'botão', 'campo', 'opção'];

  let result = text;

  // Padrão geral para palavras coladas
  result = result.replace(/([a-záàâãéèêíïóôõöúçñ])([A-ZÁÀÂÃÉÈÊÍÏÓÔÕÖÚÇÑ][a-záàâãéèêíïóôõöúçñ]+)/g, '$1 $2');

  // Correções específicas para prefixos comuns
  commonPrefixes.forEach(prefix => {
    commonWords.forEach(word => {
      const regex = new RegExp(`\\b${prefix}${word}\\b`, 'gi');
      result = result.replace(regex, `${prefix} ${word}`);
    });
  });

  return result;
}

function fixSpecificTerms(text: string): string {
  const termCorrections: Record<string, string> = {
    'jurí DICA': 'jurídica',
    'físi DICA': 'física',
    'sigaestes': 'siga estes',
    'cliqueno': 'clique no',
    'botãode': 'botão de',
    'adicionarnovo': 'adicionar novo',
    'certifique-sede': 'certifique-se de',
    'pessoa jurí': 'pessoa jurídica',
    'pessoa Física': 'pessoa física',
    'emitidosem massa': 'emitidos em massa'
  };

  let result = text;
  for (const [wrong, correct] of Object.entries(termCorrections)) {
    result = result.replace(new RegExp(wrong, 'gi'), correct);
  }
  return result;
}

function formatLists(text: string): string {
  // Detecta se já tem estrutura de lista
  const hasListFormat = /^\d+\.\s|\n\d+\.\s|^-\s|\n-\s/.test(text);

  if (!hasListFormat) {
    // Tenta criar estrutura de lista para passos sequenciais
    return text.replace(/(?:\n|^)(Passo \d+|Etapa \d+|[1-9]\.?\)?)(?::)?\s*/gi, '\n$1. ');
  }
  return text;
}

function fixPunctuation(text: string): string {
  return text
    .replace(/([.,:;!?])([A-Za-zÀ-ÿ])/g, '$1 $2') // Espaço após pontuação
    .replace(/(\w)([.!?])(\w)/g, '$1$2 $3') // Espaço após final de frase
    .replace(/,(\S)/g, ', $1') // Espaço após vírgula
    .replace(/\s+\)/g, ')') // Remove espaço antes de )
    .replace(/\(\s+/g, '('); // Remove espaço depois de (
}

function properCapitalization(text: string): string {
  return text.replace(/(^|[.!?]\s+)([a-záàâãéèêíïóôõöúçñ])/g, (match, p1, p2) => {
    return p1 + p2.toUpperCase();
  });
}