import { NextResponse } from "next/server";
import OpenAI from "openai";

// Configurações importantes para o Vercel
export const maxDuration = 30; // Máximo permitido no plano Hobby
export const dynamic = 'force-dynamic'; // Garante que a rota seja tratada como dinâmica

// Configuração do cliente OpenAI com timeout
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
  timeout: 20000, // Timeout de 20 segundos para a API
  maxRetries: 1,  // Apenas 1 tentativa para evitar demoras
});

export async function POST(request: Request) {
  // Headers padrão para todas as respostas
  const headers = {
    'Content-Type': 'application/json',
  };

  try {
    console.log("[generate-ticket] Iniciando processamento da requisição");

    // Verificação da API Key
    if (!process.env.OPENAI_API_KEY) {
      console.error("[generate-ticket] Erro: OPENAI_API_KEY não configurada");
      return NextResponse.json(
        { 
          success: false,
          error: "Configuração do serviço de IA incompleta",
          details: {
            type: "missing_api_key",
            timestamp: new Date().toISOString()
          }
        },
        { status: 500, headers }
      );
    }

    // Validação do corpo da requisição
    let sindicato: string, solicitacaoOriginal: string;
    try {
      const requestBody = await request.json();
      sindicato = requestBody.sindicato as string;
      solicitacaoOriginal = requestBody.solicitacaoOriginal as string;

      if (!sindicato || !solicitacaoOriginal) {
        console.error("[generate-ticket] Dados incompletos na requisição");
        return NextResponse.json(
          { 
            success: false,
            error: "Dados incompletos - sindicato e solicitacaoOriginal são obrigatórios"
          },
          { status: 400, headers }
        );
      }
    } catch (parseError) {
      console.error("[generate-ticket] Erro ao parsear o corpo da requisição:", parseError);
      return NextResponse.json(
        { 
          success: false,
          error: "Formato de requisição inválido"
        },
        { status: 400, headers }
      );
    }

    console.log("[generate-ticket] Dados recebidos:", {
      sindicato,
      solicitacaoOriginalLength: solicitacaoOriginal.length
    });

    // Construção do prompt otimizado
    const prompt = `Você é um especialista em gerenciamento de projetos para sindicatos. 

# Solicitação:
- Sindicato: ${sindicato}
- Descrição: ${solicitacaoOriginal}

# Formato do Ticket:
1. Título claro do projeto
2. Descrição detalhada (contexto, necessidades, objetivos)
3. 3+ tarefas específicas com:
   - Descrição
   - Passos de execução
   - Critérios de aceitação
   - Responsável (Denilson para dev, Walter para banco de dados)
4. Prazos realistas (início, conclusão, marcos)
5. Prioridade justificada
6. Requisitos técnicos
7. Observações importantes`;

    console.log("[generate-ticket] Prompt construído. Tamanho:", prompt.length);

    // Controle de timeout manual
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 25000); // 25s timeout

    try {
      console.log("[generate-ticket] Chamando API OpenAI...");
      const completion = await openai.chat.completions.create({
        model: "gpt-4-turbo-preview",
        messages: [
          {
            role: "system",
            content: `Você é um assistente especializado em criar tickets técnicos para sindicatos. Seja conciso e objetivo.`
          },
          { role: "user", content: prompt }
        ],
        temperature: 0.7,
        max_tokens: 1500, // Reduzido para melhor performance
      }, { signal: controller.signal });

      clearTimeout(timeout);

      const content = completion.choices[0]?.message?.content;
      if (!content) {
        console.error("[generate-ticket] Resposta vazia da OpenAI");
        return NextResponse.json(
          { 
            success: false,
            error: "Resposta inesperada do serviço de IA"
          },
          { status: 502, headers } // 502 Bad Gateway
        );
      }

      console.log("[generate-ticket] Ticket gerado com sucesso");
      return NextResponse.json(
        { 
          success: true,
          ticket: content,
          metadata: {
            model: completion.model,
            tokens_used: completion.usage?.total_tokens,
            created: new Date((completion.created || 0) * 1000).toISOString()
          }
        },
        { headers }
      );

    } catch (error) {
      clearTimeout(timeout);
      console.error("[generate-ticket] Erro na chamada à API OpenAI:", error);

      if (error instanceof OpenAI.APIError) {
        return NextResponse.json(
          { 
            success: false,
            error: `Erro na API OpenAI: ${error.message}`,
            details: {
              type: "openai_api_error",
              status: error.status,
              code: error.code,
              request_id: error.request_id,
              timestamp: new Date().toISOString()
            }
          },
          { status: 502, headers } // 502 Bad Gateway
        );
      } else if (error instanceof Error && error.name === 'AbortError') {
        return NextResponse.json(
          { 
            success: false,
            error: "Tempo limite excedido ao gerar o ticket"
          },
          { status: 504, headers } // 504 Gateway Timeout
        );
      }

      return NextResponse.json(
        { 
          success: false,
          error: "Erro interno ao processar a solicitação"
        },
        { status: 500, headers }
      );
    }

  } catch (error) {
    console.error("[generate-ticket] Erro durante o processamento:", error);
    return NextResponse.json(
      { 
        success: false,
        error: "Erro interno ao processar a solicitação"
      },
      { status: 500, headers }
    );
  }
}