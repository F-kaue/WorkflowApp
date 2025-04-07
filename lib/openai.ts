import OpenAI from 'openai';

// Verificar se a API key está definida, mas não lançar erro
let openai: OpenAI | null = null;

if (!process.env.OPENAI_API_KEY) {
  console.warn('OPENAI_API_KEY não está definida nas variáveis de ambiente. Funcionalidades de IA podem não estar disponíveis.');
} else {
  try {
    openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
      maxRetries: 2
    });
  } catch (error) {
    console.error('Erro ao inicializar cliente OpenAI:', error);
  }
}

export async function OpenAIStream(prompt: string): Promise<Response> {
  try {
    // Verificar se o cliente OpenAI está disponível
    if (!openai) {
      return new Response(JSON.stringify({ error: "Serviço de IA não está disponível no momento. Verifique as configurações do ambiente." }), { 
        status: 503,
        headers: { 'Content-Type': 'application/json' }
      })
    }
    
    const completion = await openai.chat.completions.create({
      messages: [
        {
          role: "system" as const,
          content: "Você é um assistente especializado em gerenciamento de projetos e chamados técnicos, com foco em desenvolvimento de software e banco de dados. Suas respostas devem ser objetivas, técnicas e bem estruturadas."
        },
        {
          role: "user" as const,
          content: prompt
        }
      ],
      model: "gpt-3.5-turbo", // Usando gpt-3.5-turbo em vez de gpt-4-turbo-preview para compatibilidade
    })

    const content = completion.choices[0].message.content
    return new Response(content)
  } catch (error: any) {
    console.error('Erro na API OpenAI:', error)
    let errorMessage = 'Erro ao processar a solicitação'
    
    if (error.response) {
      errorMessage = `Erro da API OpenAI: ${error.response.status} - ${error.response.data?.error?.message || 'Sem detalhes'}`
    } else if (error.message) {
      errorMessage = `Erro: ${error.message}`
    }
    
    return new Response(JSON.stringify({ error: errorMessage }), { 
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    })
  }
}
