import OpenAI from 'openai';

if (!process.env.OPENAI_API_KEY) {
  throw new Error('OPENAI_API_KEY não está definida nas variáveis de ambiente');
}

export const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function OpenAIStream(prompt: string): Promise<Response> {
  try {
    const completion = await openai.chat.completions.create({
      messages: [
        {
          role: "system",
          content: "Você é um assistente especializado em gerenciamento de projetos e chamados técnicos, com foco em desenvolvimento de software e banco de dados. Suas respostas devem ser objetivas, técnicas e bem estruturadas."
        },
        {
          role: "user",
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
