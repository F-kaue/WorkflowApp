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
    
    // Normalizar quebras de linha para evitar problemas de formatação
    formatted = formatted.replace(/\r\n/g, '\n');
    
    // Corrigir problemas de espaçamento entre palavras
    // Adicionar espaço após pontuação se não houver
    formatted = formatted.replace(/([.,:;!?])([A-Za-zÀ-ÿ])/g, '$1 $2');
    
    // Corrigir palavras coladas sem espaço
    formatted = formatted.replace(/([a-záàâãéèêíïóôõöúçñ])([A-ZÁÀÂÃÉÈÊÍÏÓÔÕÖÚÇÑ])/g, '$1 $2');
    
    // Separar palavras coladas (sem espaço entre elas)
    formatted = formatted.replace(/(\w)(Para|Emitir|Boleto|Clique|Acesse|Preencha|Selecione|Confirme|Certifique)/g, '$1 $2');
    
    // Corrigir problemas específicos de palavras coladas em instruções
    formatted = formatted.replace(/([a-z])(emitir|boleto|sistema|siga|passos|abaixo|acesse|módulo|contas|receber|clique|botão|adicionar|novo|representado|pelo|símbolo|canto|inferior|direito|tela|preencha|todos|campos|necessários|como|valor|data|vencimento|descrição|certifique|selecionar|opção|emissão|gerar|massa|personalize|conforme|desejado|após|preencher|mensagem|aviso|surgirá|confirmar|está|ciente|sócios|prosseguir|com|esses|conseguirá|emitir|boletos|forma|eficiente)/gi, '$1 $2');
    
    // Corrigir problemas de palavras quebradas (como "jurí DICA")
    formatted = formatted.replace(/([a-záàâãéèêíïóôõöúçñ])\s+([A-ZÁÀÂÃÉÈÊÍÏÓÔÕÖÚÇÑ]{2,})/gi, (match, p1, p2) => {
      // Se a segunda parte for uma palavra de destaque conhecida, separe corretamente
      if (/^(DICA|NOTA|IMPORTANTE|ATENÇÃO|LEMBRE)/i.test(p2)) {
        return `${p1}\n\n${p2}`;
      }
      // Caso contrário, junte as partes
      return `${p1}${p2.toLowerCase()}`;
    });
    
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
    
    // Formatar termos de destaque de maneira consistente
    formatted = formatted.replace(/(?<!\w)(importante|atenção|nota|dica|lembre-se)(?!\w)[:]*\s*/gi, (match) => {
      const term = match.replace(/[:]*\s*$/, '');
      return `\n\n${term.toUpperCase()}:\n`;
    });
    
    // Melhorar a formatação de listas de passos
    formatted = formatted.replace(/(?:\n|^)(passo\s*\d+|etapa\s*\d+)(?::)/gi, (match) => {
      return `\n\n${match.toUpperCase()}`;
    });
    
    // Adicionar quebras de linha antes de novos tópicos para melhor legibilidade
    formatted = formatted.replace(/(?:\n|^)(\d+\.\s)/g, '\n\n$1');
    
    // Garantir espaçamento adequado entre tópicos numerados
    formatted = formatted.replace(/(\d+\.)\s*([A-Za-zÀ-ÿ])/g, '$1 $2');
    
    // Garantir que os números dos passos estejam bem formatados
    formatted = formatted.replace(/(\d+)\.(\w)/g, '$1. $2');
    
    // Melhorar formatação de passos numerados
    formatted = formatted.replace(/(\n|^)(\d+)\./g, '$1$2. ');
    
    // Garantir que não haja mais de duas quebras de linha consecutivas
    formatted = formatted.replace(/\n{3,}/g, '\n\n');
    
    // Garantir que o texto comece sem quebras de linha
    formatted = formatted.replace(/^\n+/, '');
    
    // Garantir espaçamento adequado após vírgulas
    formatted = formatted.replace(/,([^\s])/g, ', $1');
    
    // Corrigir espaçamento em torno de parênteses
    formatted = formatted.replace(/\s+\)/g, ')');
    formatted = formatted.replace(/\(\s+/g, '(');
    
    return formatted;
  } catch (error) {
    console.error('Erro ao formatar texto:', error);
    return 'Não foi possível processar a resposta corretamente.';
  }
}