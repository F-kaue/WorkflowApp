import { NextResponse } from "next/server";
import OpenAI from "openai";
import { adminDb } from "@/lib/firebase-admin-server";

// Configurações importantes para o Vercel
export const maxDuration = 300; // Aumentado para 5 minutos para garantir que o processamento seja concluído
export const dynamic = 'force-dynamic'; // Garante que a rota seja tratada como dinâmica

// Configuração do cliente OpenAI com retentativas otimizados para o plano hobby do Vercel
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
  maxRetries: 2,  // Reduzido para 2 tentativas para evitar exceder o limite do Vercel
  defaultHeaders: {
    "OpenAI-Beta": "assistants=v1",
    "User-Agent": "SindSystem-WorkflowApp/1.0"
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
async function withRetry<T>(operation: () => Promise<T>, maxRetries = 2, initialDelay = 1000): Promise<T> {
  let lastError: any;
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      console.log(`[process-ticket] Tentativa ${attempt}/${maxRetries}...`);
      return await operation();
    } catch (error: any) {
      lastError = error;
      const errorDetails = error instanceof OpenAI.APIError 
        ? `Status: ${error.status}, Código: ${error.code || 'desconhecido'}, Request ID: ${error.request_id || 'desconhecido'}` 
        : error.message;
      
      console.log(`[process-ticket] Tentativa ${attempt}/${maxRetries} falhou:`, errorDetails);
      
      // Se for um erro de timeout ou abort, não tente novamente
      if (error instanceof Error && 
          (error.name === 'AbortError' || 
           error.message.includes('Request was aborted') || 
           error.message.includes('timeout'))) {
        console.log(`[process-ticket] Erro de timeout/abort detectado, não tentando novamente`);
        throw error; // Propaga o erro imediatamente
      }
      
      // Se for o último retry, não precisa esperar
      if (attempt < maxRetries) {
        const delay = initialDelay * Math.pow(2, attempt - 1); // Backoff exponencial
        console.log(`[process-ticket] Aguardando ${delay}ms antes da próxima tentativa...`);
        await sleep(delay);
      }
    }
  }
  
  throw lastError;
}

// Função para tentar diferentes modelos em caso de falha
async function tryWithDifferentModels(messages: Array<{ role: "system" | "user" | "assistant"; content: string }>, maxTokens: number) {
  let lastError: any;
  
  for (const model of AVAILABLE_MODELS) {
    try {
      console.log(`[process-ticket] Tentando com o modelo: ${model}`);
      // Reduzindo drasticamente a complexidade da requisição para modelos de fallback
      const simplifiedMessages = messages.map(msg => {
        if (msg.role === "user") {
          // Reduzir significativamente o tamanho do prompt para acelerar a resposta
          return {
            role: msg.role,
            content: msg.content.substring(0, Math.min(msg.content.length, 2000))
          };
        }
        return msg;
      });
      
      // Configurações mais conservadoras para evitar timeout
      const result = await openai.chat.completions.create({
        model: model,
        messages: simplifiedMessages,
        temperature: 0.4, // Reduzido significativamente para respostas mais diretas e rápidas
        max_tokens: Math.min(maxTokens, 1000), // Limitando ainda mais para respostas mais curtas e rápidas
      });
      
      return result;
    } catch (error: any) {
      lastError = error;
      console.log(`[process-ticket] Falha com o modelo ${model}:`, error.message);
      
      // Se o erro for de rate limit, não tente outros modelos
      if (error instanceof OpenAI.APIError && 
          (error.code === 'rate_limit_exceeded' || error.code === 'insufficient_quota')) {
        throw error;
      }
      
      // Aguardar um pouco antes de tentar o próximo modelo
      await sleep(1000);
    }
  }
  
  throw lastError;
}

// Função para determinar o responsável com base no conteúdo da solicitação
function determinarResponsavel(conteudo: string): string {
  const conteudoLowerCase = conteudo.toLowerCase();
  
  // Palavras-chave para atribuição ao Walter (banco de dados, exclusão em massa)
  const palavrasChaveWalter = [
    'banco de dados', 'database', 'sql', 'exclusão em massa', 'excluir dados',
    'migração de dados', 'backup', 'restore', 'postgresql', 'mysql', 'mongodb',
    'firebase', 'firestore', 'dados', 'relatório', 'consulta', 'query'
  ];
  
  // Verificar se o conteúdo contém palavras-chave para Walter
  for (const palavra of palavrasChaveWalter) {
    if (conteudoLowerCase.includes(palavra)) {
      return 'Walter';
    }
  }
  
  // Por padrão, atribuir ao Denilson (desenvolvimento)
  return 'Denilson';
}

// Cache simples para armazenar respostas recentes
const ticketCache = new Map();

// Função para gerar uma chave de cache baseada no sindicato e na solicitação
function generateCacheKey(sindicato: string, solicitacao: string): string {
  // Normaliza a solicitação removendo espaços extras e convertendo para minúsculas
  const normalizedSolicitacao = solicitacao.trim().toLowerCase();
  return `${sindicato.trim().toLowerCase()}:${normalizedSolicitacao}`;
}

// Função para processar o ticket em segundo plano
async function processarTicket(ticketId: string, sindicato: string, solicitacaoOriginal: string) {
  try {
    console.log(`[process-ticket] Iniciando processamento do ticket ${ticketId}`);
    
    // Atualizar status para "processando" imediatamente
    await adminDb.collection("ticket_queue").doc(ticketId).update({
      status: "processando",
      mensagem: "Gerando ticket com IA...",
      atualizadoEm: new Date(),
      progressoEstimado: 10
    });
    
    // Verificar cache para solicitações similares
    const cacheKey = generateCacheKey(sindicato, solicitacaoOriginal);
    if (ticketCache.has(cacheKey)) {
      console.log(`[process-ticket] Usando resposta em cache para ticket ${ticketId}`);
      
      // Simular um pequeno atraso para feedback visual ao usuário
      await sleep(1500);
      
      // Atualizar progresso para feedback visual
      await adminDb.collection("ticket_queue").doc(ticketId).update({
        mensagem: "Recuperando ticket de cache...",
        progressoEstimado: 50
      });
      
      // Recuperar do cache
      const cachedContent = ticketCache.get(cacheKey);
      
      // Atualizar o documento com o ticket do cache
      await adminDb.collection("ticket_queue").doc(ticketId).update({
        status: "concluido",
        ticketGerado: cachedContent,
        mensagem: "Ticket gerado com sucesso (cache)",
        atualizadoEm: new Date(),
        progressoEstimado: 100,
        metadata: {
          source: "cache",
          created: new Date().toISOString()
        }
      });
      
      console.log(`[process-ticket] Ticket ${ticketId} processado com sucesso (cache)`);
      return cachedContent;
    }
    
    // Determinar o responsável principal com base no conteúdo da solicitação
    const responsavelPrincipal = determinarResponsavel(solicitacaoOriginal);
    console.log(`[process-ticket] Responsável principal determinado: ${responsavelPrincipal}`);

    // Atualizar progresso para feedback visual
    await adminDb.collection("ticket_queue").doc(ticketId).update({
      mensagem: "Analisando solicitação...",
      progressoEstimado: 20
    });

    // Construção do prompt otimizado e reduzido para respostas mais rápidas
    const prompt = `Crie um ticket detalhado para o sindicato ${sindicato} com base nesta solicitação: ${solicitacaoOriginal}

Formato obrigatório:
## ${sindicato} - [TÍTULO]

### Descrição: [2-3 parágrafos técnicos]

### Duração Estimada: [período]

### FASE 1 – [Nome]
#### [TAREFA 1]
• Descrição: [contexto e objetivo]
• Passos: [implementação]
• Critérios: [aceitação]

#### [TAREFA 2]
• Descrição: [contexto e objetivo]
• Passos: [implementação]
• Critérios: [aceitação]

### FASE 2 – [Nome]
#### [TAREFA 1]
• Descrição: [contexto e objetivo]
• Passos: [implementação]
• Critérios: [aceitação]

### Responsáveis:
- Principal: ${responsavelPrincipal}
- Desenvolvimento: Denilson
- Banco de Dados: Walter

### Prioridade: [Alta/Média/Baixa] - [justificativa]

### Requisitos Técnicos:
• [requisitos]

### Observações:
• [observações]`;

    console.log(`[process-ticket] Prompt construído. Tamanho: ${prompt.length}`);
    
    // Atualizar progresso para feedback visual
    await adminDb.collection("ticket_queue").doc(ticketId).update({
      mensagem: "Gerando conteúdo do ticket...",
      progressoEstimado: 40
    });
    
    const messages = [
      {
        role: "system" as const,
        content: `Você é um assistente especializado em criar tickets técnicos para sindicatos. Seja direto, técnico e siga exatamente o formato solicitado. Para banco de dados/relatórios, atribua ao Walter; para desenvolvimento, ao Denilson. Crie títulos específicos e descritivos para cada tarefa.`
      },
      { role: "user" as const, content: prompt }
    ];
    
    // Primeiro tentamos com o sistema de retentativas otimizado para velocidade
    const completion = await withRetry(async () => {
      console.log("[process-ticket] Tentando chamada à API OpenAI...");
      try {
        // Atualizar progresso para feedback visual
        await adminDb.collection("ticket_queue").doc(ticketId).update({
          mensagem: "Processando com IA...",
          progressoEstimado: 60
        });
        
        // Usando configurações otimizadas para velocidade
        return await openai.chat.completions.create({
          model: AVAILABLE_MODELS[0], // Usa o modelo mais avançado (gpt-4-turbo-preview)
          messages: messages,
          temperature: 0.3, // Reduzido para respostas mais diretas e rápidas
          max_tokens: 1000, // Reduzido para diminuir o tempo de resposta
          presence_penalty: -0.1, // Incentiva respostas mais concisas
          frequency_penalty: 0.1, // Reduz repetições
        });
      } catch (error) {
        // Se falhar com o modelo principal, tenta com os modelos alternativos
        if (error instanceof OpenAI.APIError && 
            (error.code === 'model_not_available' || error.status === 404)) {
          console.log("[process-ticket] Modelo principal não disponível, tentando modelos alternativos...");
          
          // Atualizar progresso para feedback visual
          await adminDb.collection("ticket_queue").doc(ticketId).update({
            mensagem: "Tentando modelo alternativo...",
            progressoEstimado: 50
          });
          
          return await tryWithDifferentModels(messages, 1000); // Reduzido para 1000 tokens
        }
        throw error; // Propaga o erro para ser tratado pelo withRetry
      }
    }, 2, 1000); // 2 tentativas com 1s de espera inicial

    // Atualizar progresso para feedback visual
    await adminDb.collection("ticket_queue").doc(ticketId).update({
      mensagem: "Finalizando geração...",
      progressoEstimado: 80
    });

    const content = completion.choices[0]?.message?.content;
    if (!content) {
      throw new Error("Resposta vazia da OpenAI");
    }

    // Armazenar no cache para uso futuro
    ticketCache.set(cacheKey, content);
    
    // Limitar o tamanho do cache (manter apenas os 20 mais recentes)
    if (ticketCache.size > 20) {
      const oldestKey = ticketCache.keys().next().value;
      ticketCache.delete(oldestKey);
    }

    // Atualizar o documento com o ticket gerado
    await adminDb.collection("ticket_queue").doc(ticketId).update({
      status: "concluido",
      ticketGerado: content,
      mensagem: "Ticket gerado com sucesso",
      atualizadoEm: new Date(),
      progressoEstimado: 100,
      metadata: {
        model: completion.model,
        tokens_used: completion.usage?.total_tokens,
        created: new Date().toISOString()
      }
    });

    console.log(`[process-ticket] Ticket ${ticketId} processado com sucesso`);
    return content;
  } catch (error) {
    console.error(`[process-ticket] Erro ao processar ticket ${ticketId}:`, error);
    
    // Atualizar status para "erro"
    try {
      let errorMessage = "Erro desconhecido ao processar o ticket";
      
      if (error instanceof Error) {
        errorMessage = error.message;
      } else if (typeof error === 'string') {
        errorMessage = error;
      }
      
      await adminDb.collection("ticket_queue").doc(ticketId).update({
        status: "erro",
        mensagem: errorMessage,
        atualizadoEm: new Date(),
        progressoEstimado: 0
      });
    } catch (updateError) {
      console.error(`[process-ticket] Erro ao atualizar status do ticket ${ticketId}:`, updateError);
    }
    
    throw error;
  }
}

// Endpoint para iniciar o processamento de um ticket
export async function POST(request: Request) {
  // Headers padrão para todas as respostas
  const headers = {
    'Content-Type': 'application/json',
  };

  try {
    console.log("[process-ticket] Iniciando processamento da requisição");

    // Verificação da API Key
    if (!process.env.OPENAI_API_KEY) {
      console.error("[process-ticket] Erro: OPENAI_API_KEY não configurada");
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
      console.log("[process-ticket] Corpo da requisição recebido:", JSON.stringify(requestBody));
      
      // Verificar se o corpo da requisição é um objeto
      if (!requestBody || typeof requestBody !== 'object') {
        console.error("[process-ticket] Corpo da requisição inválido: não é um objeto");
        return NextResponse.json(
          { 
            success: false,
            error: "Formato de requisição inválido - corpo deve ser um objeto JSON",
            details: {
              received: typeof requestBody,
              timestamp: new Date().toISOString()
            }
          },
          { status: 400, headers }
        );
      }
      
      // Extrair e validar os campos individualmente
      sindicato = requestBody.sindicato;
      solicitacaoOriginal = requestBody.solicitacaoOriginal;
      
      // Validar tipo e presença dos campos obrigatórios
      if (!sindicato || typeof sindicato !== 'string') {
        console.error("[process-ticket] Campo 'sindicato' inválido ou ausente");
        return NextResponse.json(
          { 
            success: false,
            error: "Campo 'sindicato' é obrigatório e deve ser uma string",
            details: {
              received: sindicato ? typeof sindicato : 'undefined',
              timestamp: new Date().toISOString()
            }
          },
          { status: 400, headers }
        );
      }
      
      if (!solicitacaoOriginal || typeof solicitacaoOriginal !== 'string') {
        console.error("[process-ticket] Campo 'solicitacaoOriginal' inválido ou ausente");
        return NextResponse.json(
          { 
            success: false,
            error: "Campo 'solicitacaoOriginal' é obrigatório e deve ser uma string",
            details: {
              received: solicitacaoOriginal ? typeof solicitacaoOriginal : 'undefined',
              timestamp: new Date().toISOString()
            }
          },
          { status: 400, headers }
        );
      }
    } catch (parseError) {
      console.error("[process-ticket] Erro ao parsear o corpo da requisição:", parseError);
      return NextResponse.json(
        { 
          success: false,
          error: "Formato de requisição inválido - verifique se o corpo é um JSON válido",
          details: {
            error: parseError instanceof Error ? parseError.message : String(parseError),
            timestamp: new Date().toISOString()
          }
        },
        { status: 400, headers }
      );
    }

    // Criar um novo documento na coleção ticket_queue
    const ticketRef = await adminDb.collection("ticket_queue").add({
      sindicato,
      solicitacaoOriginal,
      status: "pendente",
      mensagem: "Ticket adicionado à fila de processamento",
      criadoEm: new Date(),
      atualizadoEm: new Date()
    });

    const ticketId = ticketRef.id;
    console.log(`[process-ticket] Ticket ${ticketId} adicionado à fila`);

    // Iniciar o processamento em segundo plano (sem await)
    processarTicket(ticketId, sindicato, solicitacaoOriginal).catch(error => {
      console.error(`[process-ticket] Erro no processamento em segundo plano do ticket ${ticketId}:`, error);
    });

    // Retornar imediatamente com o ID do ticket
    return NextResponse.json(
      { 
        success: true,
        ticketId,
        message: "Ticket adicionado à fila de processamento. Verifique o status periodicamente.",
        status: "pendente"
      },
      { headers }
    );

  } catch (error) {
    console.error("[process-ticket] Erro durante o processamento:", error);
    return NextResponse.json(
      { 
        success: false,
        error: "Erro interno ao processar a solicitação",
        details: {
          type: "internal_error",
          message: error instanceof Error ? error.message : String(error),
          stack: error instanceof Error ? error.stack : undefined,
          timestamp: new Date().toISOString()
        },
        userMessage: "Ocorreu um erro ao processar o ticket. Por favor, tente novamente mais tarde."
      },
      { status: 500, headers }
    );
  }
}

// Endpoint para verificar o status de um ticket
export async function GET(request: Request) {
  const headers = {
    'Content-Type': 'application/json',
  };

  try {
    // Extrair o ID do ticket da URL
    const url = new URL(request.url);
    const ticketId = url.searchParams.get('ticketId');

    if (!ticketId) {
      return NextResponse.json(
        { 
          success: false,
          error: "ID do ticket não fornecido",
          details: {
            timestamp: new Date().toISOString()
          }
        },
        { status: 400, headers }
      );
    }

    // Buscar o ticket no Firestore
    const ticketDoc = await adminDb.collection("ticket_queue").doc(ticketId).get();

    if (!ticketDoc.exists) {
      return NextResponse.json(
        { 
          success: false,
          error: "Ticket não encontrado",
          details: {
            ticketId,
            timestamp: new Date().toISOString()
          }
        },
        { status: 404, headers }
      );
    }

    const ticketData = ticketDoc.data();

    // Retornar os dados do ticket
    return NextResponse.json(
      { 
        success: true,
        ticketId,
        status: ticketData?.status || "desconhecido",
        mensagem: ticketData?.mensagem || "",
        ticketGerado: ticketData?.status === "concluido" ? ticketData.ticketGerado : undefined,
        atualizadoEm: ticketData?.atualizadoEm?.toDate?.()?.toISOString() || null
      },
      { headers }
    );

  } catch (error) {
    console.error("[process-ticket] Erro ao verificar status do ticket:", error);
    return NextResponse.json(
      { 
        success: false,
        error: "Erro ao verificar status do ticket",
        details: {
          message: error instanceof Error ? error.message : String(error),
          timestamp: new Date().toISOString()
        }
      },
      { status: 500, headers }
    );
  }
}