import { NextResponse } from "next/server";
import OpenAI from "openai";

// Configurações importantes para o Vercel
export const maxDuration = 60; // Aumentado para 60 segundos
export const dynamic = 'force-dynamic'; // Garante que a rota seja tratada como dinâmica

// Configuração do cliente OpenAI com timeout e retentativas
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
  timeout: 50000, // Aumentado para 50 segundos
  maxRetries: 3,  // Aumentado para 3 tentativas
  defaultHeaders: {
    "OpenAI-Beta": "assistants=v1"
  },
  defaultQuery: {
    "request-timeout": "50s"
  }
});

// Função para esperar um tempo específico
const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// Função para tentar executar uma operação com retentativas
async function withRetry<T>(operation: () => Promise<T>, maxRetries = 3, initialDelay = 1000): Promise<T> {
  let lastError: any;
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error: any) {
      lastError = error;
      console.log(`[generate-ticket] Tentativa ${attempt} falhou:`, error.message);
      
      // Se for o último retry, não precisa esperar
      if (attempt < maxRetries) {
        const delay = initialDelay * Math.pow(2, attempt - 1); // Backoff exponencial
        console.log(`[generate-ticket] Aguardando ${delay}ms antes da próxima tentativa...`);
        await sleep(delay);
      }
    }
  }
  
  throw lastError;
}

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

    // Controle de timeout manual com tempo aumentado
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 55000); // 55s timeout

    try {
      console.log("[generate-ticket] Chamando API OpenAI com sistema de retentativas...");
      
      const completion = await withRetry(async () => {
        console.log("[generate-ticket] Tentando chamada à API OpenAI...");
        return await openai.chat.completions.create({
          model: "gpt-4-turbo-preview",
          messages: [
            {
              role: "system",
              content: `Você é um assistente especializado em criar tickets técnicos para sindicatos. Seja conciso e objetivo.`
            },
            { role: "user", content: prompt }
          ],
          temperature: 0.7,
          max_tokens: 1500,
        }, { signal: controller.signal });
      }, 3, 2000); // 3 tentativas com 2s de espera inicial

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
        console.error(`[generate-ticket] Erro na API OpenAI: ${error.message}, Status: ${error.status}, Código: ${error.code}`);
        
        // Tratamento específico para diferentes tipos de erros da OpenAI
        if (error.code === 'insufficient_quota') {
          return NextResponse.json(
            { 
              success: false,
              error: "Limite de cota da API OpenAI atingido",
              details: {
                type: "openai_quota_error",
                status: error.status,
                code: error.code,
                request_id: error.request_id,
                timestamp: new Date().toISOString()
              }
            },
            { status: 402, headers } // 402 Payment Required
          );
        } else if (error.code === 'rate_limit_exceeded') {
          return NextResponse.json(
            { 
              success: false,
              error: "Limite de requisições da API OpenAI atingido. Tente novamente em alguns segundos.",
              details: {
                type: "openai_rate_limit_error",
                status: error.status,
                code: error.code,
                request_id: error.request_id,
                timestamp: new Date().toISOString()
              }
            },
            { status: 429, headers } // 429 Too Many Requests
          );
        } else {
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
        }
      } else if (error instanceof Error && error.name === 'AbortError') {
        console.error("[generate-ticket] Timeout atingido após múltiplas tentativas");
        return NextResponse.json(
          { 
            success: false,
            error: "Tempo limite excedido ao gerar o ticket",
            details: {
              type: "timeout_error",
              message: error.message,
              timestamp: new Date().toISOString()
            }
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