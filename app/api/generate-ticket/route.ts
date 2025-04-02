import { NextResponse } from "next/server";
import OpenAI from "openai";

// Configurações importantes para o Vercel
export const maxDuration = 300; // Aumentado para 300 segundos (5 minutos) para garantir tempo suficiente
export const dynamic = 'force-dynamic'; // Garante que a rota seja tratada como dinâmica

// Configuração do cliente OpenAI com timeout e retentativas
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
  timeout: 120000, // Aumentado para 120 segundos (2 minutos)
  maxRetries: 5,  // Aumentado para 5 tentativas
  defaultHeaders: {
    "OpenAI-Beta": "assistants=v1",
    "User-Agent": "SindSystem-WorkflowApp/1.0"
  },
  defaultQuery: {
    "request-timeout": "120s"
  }
});

// Modelos disponíveis em ordem de preferência
const AVAILABLE_MODELS = [
  "gpt-4-turbo-preview",
  "gpt-4",
  "gpt-3.5-turbo"
];

// Função para esperar um tempo específico
const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// Função para tentar executar uma operação com retentativas
async function withRetry<T>(operation: () => Promise<T>, maxRetries = 5, initialDelay = 2000): Promise<T> {
  let lastError: any;
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      console.log(`[generate-ticket] Tentativa ${attempt}/${maxRetries}...`);
      return await operation();
    } catch (error: any) {
      lastError = error;
      const errorDetails = error instanceof OpenAI.APIError 
        ? `Status: ${error.status}, Código: ${error.code || 'desconhecido'}, Request ID: ${error.request_id || 'desconhecido'}` 
        : error.message;
      
      console.log(`[generate-ticket] Tentativa ${attempt}/${maxRetries} falhou:`, errorDetails);
      
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

// Função para tentar diferentes modelos em caso de falha
async function tryWithDifferentModels(messages: Array<{ role: "system" | "user" | "assistant"; content: string }>, maxTokens: number, controller: AbortController) {
  let lastError: any;
  
  for (const model of AVAILABLE_MODELS) {
    try {
      console.log(`[generate-ticket] Tentando com o modelo: ${model}`);
      const result = await openai.chat.completions.create({
        model: model,
        messages: messages,
        temperature: 0.7,
        max_tokens: maxTokens,
      }, { signal: controller.signal });
      
      return result;
    } catch (error: any) {
      lastError = error;
      console.log(`[generate-ticket] Falha com o modelo ${model}:`, error.message);
      
      // Se o erro for de timeout ou rate limit, não tente outros modelos
      if (error instanceof Error && error.name === 'AbortError') {
        throw error;
      }
      
      if (error instanceof OpenAI.APIError && 
          (error.code === 'rate_limit_exceeded' || error.code === 'insufficient_quota')) {
        throw error;
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
    const timeout = setTimeout(() => {
      console.log("[generate-ticket] Timeout atingido, abortando requisição...");
      controller.abort();
    }, 240000); // 240s timeout (4 minutos)

    try {
      console.log("[generate-ticket] Iniciando chamada à API OpenAI com sistema de retentativas e fallback...");
      
      const messages = [
        {
          role: "system" as const,
          content: `Você é um assistente especializado em criar tickets técnicos para sindicatos. Seja conciso e objetivo.`
        },
        { role: "user" as const, content: prompt }
      ];
      
      // Primeiro tentamos com o sistema de retentativas normal
      const completion = await withRetry(async () => {
        console.log("[generate-ticket] Tentando chamada à API OpenAI...");
        try {
          return await openai.chat.completions.create({
            model: AVAILABLE_MODELS[0], // Usa o primeiro modelo (mais avançado)
            messages: messages,
            temperature: 0.7,
            max_tokens: 1500,
          }, { signal: controller.signal });
        } catch (error) {
          // Se falhar com o modelo principal, tenta com os modelos alternativos
          if (error instanceof OpenAI.APIError && 
              (error.code === 'model_not_available' || error.status === 404)) {
            console.log("[generate-ticket] Modelo principal não disponível, tentando modelos alternativos...");
            return await tryWithDifferentModels(messages, 1500, controller);
          }
          throw error; // Propaga o erro para ser tratado pelo withRetry
        }
      }, 5, 2000); // 5 tentativas com 2s de espera inicial

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
        console.error(`[generate-ticket] Erro na API OpenAI: ${error.message}, Status: ${error.status}, Código: ${error.code}, Request ID: ${error.request_id || 'desconhecido'}`);
        
        // Tratamento específico para diferentes tipos de erros da OpenAI
        if (error.code === 'insufficient_quota') {
          return NextResponse.json(
            { 
              success: false,
              error: "Limite de cota da API OpenAI atingido. Por favor, verifique sua conta OpenAI.",
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
        } else if (error.code === 'model_not_available' || error.status === 404) {
          return NextResponse.json(
            { 
              success: false,
              error: "O modelo de IA solicitado não está disponível no momento. Tente novamente mais tarde.",
              details: {
                type: "openai_model_error",
                status: error.status,
                code: error.code,
                request_id: error.request_id,
                timestamp: new Date().toISOString()
              }
            },
            { status: 503, headers } // 503 Service Unavailable
          );
        } else if (error.status === 400) {
          return NextResponse.json(
            { 
              success: false,
              error: "Requisição inválida para o serviço de IA. Verifique os parâmetros enviados.",
              details: {
                type: "openai_bad_request",
                status: error.status,
                code: error.code,
                request_id: error.request_id,
                message: error.message,
                timestamp: new Date().toISOString()
              }
            },
            { status: 400, headers } // 400 Bad Request
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
            error: "Tempo limite excedido ao gerar o ticket. A solicitação pode ser muito complexa ou o serviço está sobrecarregado. Tente novamente com uma solicitação mais simples ou mais tarde.",
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