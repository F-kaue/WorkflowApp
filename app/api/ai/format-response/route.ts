import { NextResponse } from 'next/server';

type FormatRequestBody = {
  response: string;
};

export async function POST(request: Request) {
  try {
    // Verificar se o corpo da requisição é válido
    let body: FormatRequestBody;
    try {
      body = await request.json();
    } catch (parseError) {
      console.error('Erro ao fazer parsing do JSON da requisição:', parseError);
      return NextResponse.json(
        { error: 'Formato de requisição inválido' },
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }
    
    const { response } = body;

    if (!response) {
      return NextResponse.json(
        { error: 'Resposta não fornecida' },
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Formatar a resposta para ser mais organizada e explicativa
    const formattedResponse = formatResponse(response);

    return NextResponse.json(
      { response: formattedResponse },
      { headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Erro ao formatar resposta:', error);
    return NextResponse.json(
      { error: 'Erro ao processar a solicitação' },
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}

function formatResponse(text: string): string {
  // Verificar se o texto é válido antes de processar
  if (!text || typeof text !== 'string') {
    return 'Não foi possível processar a resposta.';
  }
  
  try {
    // Remover asteriscos desnecessários
    let formatted = text.replace(/\*\*/g, '');
    
    // Identificar se o texto já tem estrutura de tópicos
    const hasBulletPoints = /^\d+\.\s|^-\s|^•\s/m.test(formatted);
    
    if (!hasBulletPoints) {
      // Dividir em parágrafos
      const paragraphs = formatted.split(/\n{2,}/);
      
      // Se tiver mais de 2 parágrafos, converter em tópicos
      if (paragraphs.length > 2) {
        formatted = paragraphs.map((para, index) => {
          // Ignorar parágrafos muito curtos ou introdutórios
          if (para.length < 30 || index === 0) {
            return para;
          }
          return `${index}. ${para}`;
        }).join('\n\n');
      }
    }
    
    // Adicionar formatação para destacar termos importantes
    formatted = formatted.replace(/(?<!\w)(importante|atenção|nota|dica|lembre-se)(?!\w)/gi, (match) => {
      return `\n${match.toUpperCase()}:\n`;
    });
    
    // Melhorar a formatação de listas de passos
    formatted = formatted.replace(/(?:\n|^)(passo\s*\d+|etapa\s*\d+)(?::)/gi, (match) => {
      return `\n${match.toUpperCase()}`;
    });
    
    // Adicionar quebras de linha antes de novos tópicos para melhor legibilidade
    formatted = formatted.replace(/(?:\n|^)(\d+\.\s)/g, '\n$1');
    
    return formatted;
  } catch (error) {
    console.error('Erro ao formatar texto:', error);
    return 'Não foi possível processar a resposta corretamente.';
  }
}