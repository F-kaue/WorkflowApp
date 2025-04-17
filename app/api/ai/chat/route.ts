import { NextRequest } from "next/server";
import OpenAI from "openai";
import { adminDb } from "@/lib/firebase-admin-server";

// Configurações importantes para o Vercel
export const maxDuration = 300;
export const dynamic = 'force-dynamic';

// Configuração do cliente OpenAI
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
  maxRetries: 2,
  timeout: 60000,
});

// Função para criar um encoder uma vez
const encoder = new TextEncoder();

// Função para buscar conhecimento da base de dados
async function getTrainingKnowledge() {
  try {
    const querySnapshot = await adminDb.collection("ai_training")
      .orderBy("timestamp", "desc")
      .get();
    
    const knowledge = querySnapshot.docs.map((doc: any) => doc.data().content).join("\n\n");
    return knowledge;
  } catch (error) {
    console.error("Erro ao buscar conhecimento:", error);
    return "";
  }
}

export async function POST(request: NextRequest) {
  // Headers para streaming
  const headers = {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
  };

  try {
    // Verificação da API Key
    if (!process.env.OPENAI_API_KEY) {
      throw new Error("API Key da OpenAI não configurada");
    }

    // Validação do corpo da requisição
    const requestBody = await request.json();
    const { message } = requestBody;
    
    if (!message) {
      throw new Error("Campo 'message' é obrigatório");
    }

    // Buscar conhecimento da base de dados
    const trainingKnowledge = await getTrainingKnowledge();

    // Construir o prompt do sistema
    const systemPrompt = `Você é um assistente especializado no sistema SindSystem, um software completo para gestão de sindicatos.
Você tem conhecimento profundo sobre todas as funcionalidades do sistema e deve:

1. Fornecer respostas diretas e objetivas
2. Usar linguagem técnica apropriada
3. Referenciar módulos e funcionalidades específicas do sistema
4. Incluir passos detalhados quando necessário
5. Manter o contexto das conversas anteriores

Conhecimento específico do sistema:

${trainingKnowledge}

Se não souber algo com certeza, admita e sugira consultar a documentação ou o suporte.`;

    // Criar um ReadableStream para enviar a resposta
    const stream = new ReadableStream({
      async start(controller) {
        try {
          const completion = await openai.chat.completions.create({
            model: "gpt-3.5-turbo",
      messages: [
              { role: "system", content: systemPrompt },
              { role: "user", content: message }
      ],
      temperature: 0.7,
            max_tokens: 2000,
            stream: true,
          });

          let accumulatedContent = '';

          for await (const chunk of completion) {
            const content = chunk.choices[0]?.delta?.content || '';
            if (content) {
              accumulatedContent += content;
              controller.enqueue(encoder.encode(content));
            }
          }
          
          controller.close();

          // Salvar a conversa no histórico em background
          try {
            const messagesCollection = adminDb.collection('chat_history');
            
            // Salvar mensagem do usuário
            await messagesCollection.add({
              role: 'user',
              content: message,
              timestamp: new Date(),
            });

            // Salvar resposta do assistente
            await messagesCollection.add({
              role: 'assistant',
              content: accumulatedContent,
              timestamp: new Date(),
            });
          } catch (error) {
            console.error("Erro ao salvar no histórico:", error);
          }
        } catch (error) {
          console.error("Erro durante a geração:", error);
          controller.error(error);
        }
      },
      cancel() {
        // Cleanup se necessário
      }
    });

    return new Response(stream, {
      headers: {
        ...headers,
        'X-Content-Type-Options': 'nosniff'
      }
    });

  } catch (error) {
    console.error("Erro na geração da resposta:", error);

    if (error instanceof OpenAI.APIError) {
      return new Response(
        JSON.stringify({
          error: `Erro na API da OpenAI: ${error.message}`,
          code: error.code,
          status: error.status
        }),
        { 
          status: error.status || 500,
          headers: {
            'Content-Type': 'application/json'
          }
        }
      );
    }

    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : "Erro interno ao gerar resposta",
      }),
      { 
        status: 500,
        headers: {
          'Content-Type': 'application/json'
        }
      }
    );
  }
}
