import { NextRequest } from "next/server";
import OpenAI from "openai";
import { adminDb } from "@/lib/firebase-admin-server";
import { findSimilarTicket, cacheTicket } from "@/lib/ticket-cache";

// Configurações importantes para o Vercel
export const maxDuration = 60; // Limitado a 60 segundos (1 minuto) para compatibilidade com o plano hobby do Vercel
export const dynamic = 'force-dynamic'; // Garante que a rota seja tratada como dinâmica

// Configuração do cliente OpenAI com retentativas otimizados para o plano hobby do Vercel
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
  maxRetries: 1,  // Reduzido para 1 tentativa para evitar exceder o limite do Vercel
  timeout: 25000, // Timeout de 25 segundos para a requisição à API
});

// Modelos disponíveis em ordem de preferência
const AVAILABLE_MODELS = [
  "gpt-3.5-turbo", // Usando modelo mais rápido como primeira opção para streaming
  "gpt-4-turbo-preview",
  "gpt-4"
];

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

// Função para criar um stream de texto
function createStream(text: string): ReadableStream<Uint8Array> {
  const encoder = new TextEncoder();
  
  return new ReadableStream({
    start(controller) {
      controller.enqueue(encoder.encode(text));
      controller.close();
    },
  });
}

// Função para esperar um tempo específico
const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// Função para tentar com modelo alternativo em caso de falha
async function tryWithFallbackModel(prompt: string, systemPrompt: string, model: string) {
  console.log(`[generate-ticket/stream] Tentando com modelo alternativo: ${model}`);
  
  try {
    const fallbackStream = await openai.chat.completions.create({
      model: model,
      messages: [
        {
          role: "system",
          content: systemPrompt
        },
        { role: "user", content: prompt }
      ],
      temperature: 0.3,
      max_tokens: 800, // Limitado para respostas mais rápidas
      stream: true,
    });
    
    console.log(`[generate-ticket/stream] Modelo alternativo ${model} respondeu com sucesso`);
    return fallbackStream;
  } catch (error) {
    console.error(`[generate-ticket/stream] Erro no modelo alternativo ${model}:`, error);
    throw error;
  }
}

export async function POST(request: NextRequest) {
  console.log("[generate-ticket/stream] Iniciando processamento da requisição");
  
  // Headers para streaming
  const headers = {
    'Content-Type': 'text/plain; charset=utf-8',
    'Transfer-Encoding': 'chunked',
    'Connection': 'keep-alive',
    'Cache-Control': 'no-cache, no-transform',
  };
  
  // Configurar timeout para a requisição
  const timeoutMs = 40000; // 40 segundos (abaixo do limite de 60s do Vercel)
  let timeoutId: NodeJS.Timeout | null = null;
  
  // Criar uma promise que será rejeitada após o timeout
  const timeoutPromise = new Promise<never>((_, reject) => {
    timeoutId = setTimeout(() => {
      console.log("[generate-ticket/stream] Timeout atingido após", timeoutMs, "ms");
      reject(new Error("Timeout ao gerar ticket"));
    }, timeoutMs);
  });

  try {
    // Verificação da API Key
    if (!process.env.OPENAI_API_KEY) {
      console.error("[generate-ticket/stream] API Key não configurada");
      return new Response(
        "Configuração do serviço de IA incompleta",
        { status: 500, headers }
      );
    }

    // Validação do corpo da requisição
    let requestBody;
    try {
      requestBody = await request.json();
      console.log("[generate-ticket/stream] Corpo da requisição recebido");
    } catch (error) {
      console.error("[generate-ticket/stream] Erro ao parsear JSON da requisição:", error);
      return new Response(
        "Formato de requisição inválido - JSON mal formatado",
        { status: 400, headers }
      );
    }
    
    // Verificar se o corpo da requisição é um objeto
    if (!requestBody || typeof requestBody !== 'object') {
      console.error("[generate-ticket/stream] Corpo da requisição não é um objeto");
      return new Response(
        "Formato de requisição inválido - corpo deve ser um objeto JSON",
        { status: 400, headers }
      );
    }
    
    // Extrair e validar os campos individualmente
    const { sindicato, solicitacaoOriginal } = requestBody;
    
    if (!sindicato || typeof sindicato !== 'string' || sindicato.trim().length === 0) {
      console.error("[generate-ticket/stream] Campo 'sindicato' inválido");
      return new Response(
        "Campo 'sindicato' é obrigatório e deve ser uma string não vazia",
        { status: 400, headers }
      );
    }
    
    if (!solicitacaoOriginal || typeof solicitacaoOriginal !== 'string' || solicitacaoOriginal.trim().length === 0) {
      console.error("[generate-ticket/stream] Campo 'solicitacaoOriginal' inválido");
      return new Response(
        "Campo 'solicitacaoOriginal' é obrigatório e deve ser uma string não vazia",
        { status: 400, headers }
      );
    }

    console.log(`[generate-ticket/stream] Gerando ticket para sindicato: ${sindicato}`);

    // Verificar cache para solicitações similares
    const cachedTicket = findSimilarTicket(sindicato, solicitacaoOriginal);
    if (cachedTicket) {
      console.log("[generate-ticket/stream] Usando ticket em cache");
      // Limpar o timeout já que não precisamos mais dele
      if (timeoutId) clearTimeout(timeoutId);
      
      // Simular um pequeno atraso para dar feedback visual ao usuário
      await sleep(500);
      return new Response(createStream(cachedTicket), { headers });
    }

    // Determinar o responsável principal com base no conteúdo da solicitação
    const responsavelPrincipal = determinarResponsavel(solicitacaoOriginal);
    console.log(`[generate-ticket/stream] Responsável determinado: ${responsavelPrincipal}`);

    // Construção do prompt simplificado para melhor desempenho
    const prompt = `Crie um ticket detalhado para o sindicato ${sindicato} com a seguinte solicitação: ${solicitacaoOriginal}.

O ticket deve seguir este formato:

## ${sindicato} - [TÍTULO DO PROJETO]

### Descrição de Projeto:
[Descrição detalhada]

### Duração Total Estimada: [Período estimado]

### FASE 1 – [Nome da Fase]

#### [TÍTULO DA TAREFA]
• Descrição detalhada da tarefa: [Descrição]
• Passos específicos de implementação: [Passos]
• Critérios de aceitação: [Critérios]

### FASE 2 – [Nome da Fase]

#### [TÍTULO DA TAREFA]
• Descrição detalhada da tarefa: [Descrição]
• Passos específicos de implementação: [Passos]
• Critérios de aceitação: [Critérios]

### Responsáveis:
- Responsável Principal: ${responsavelPrincipal}
- Desenvolvimento: Denilson
- Banco de Dados: Walter

### Prioridade: [Alta/Média/Baixa]
[Justificativa]

### Requisitos Técnicos:
• [Lista de requisitos]

### Observações Importantes:
• [Observações]`;

    const systemPrompt = `Você é um especialista em gerenciamento de projetos para sindicatos. Crie tickets detalhados e técnicos.`;

    // Criar stream para a resposta da OpenAI
    try {
      console.log(`[generate-ticket/stream] Iniciando chamada à API OpenAI com modelo ${AVAILABLE_MODELS[0]}`);
      
      // Criar uma Promise para a chamada à OpenAI
      const openaiPromise = openai.chat.completions.create({
        model: AVAILABLE_MODELS[0],
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: prompt }
        ],
        temperature: 0.4, // Temperatura mais baixa para respostas mais previsíveis e rápidas
        max_tokens: 1000, // Limitado para respostas mais rápidas
        stream: true, // Habilitar streaming
      });
      
      // Usar Promise.race para implementar o timeout
      const stream = await Promise.race([
        openaiPromise,
        timeoutPromise
      ]).catch((error) => {
        console.error("[generate-ticket/stream] Erro durante a geração:", error.message);
        throw error; // Propagar o erro para ser tratado no catch
      });
      
      // Limpar o timeout já que a requisição foi bem-sucedida
      if (timeoutId) clearTimeout(timeoutId);
      
      console.log("[generate-ticket/stream] Resposta da API OpenAI recebida com sucesso");

      // Salvar no Firestore em background sem bloquear a resposta
      if (adminDb) {
        // Não aguardamos a conclusão para não atrasar a resposta
        adminDb.collection("generated_tickets").add({
          sindicato,
          solicitacaoOriginal,
          responsavelPrincipal,
          timestamp: new Date().toISOString(),
          streaming: true
        }).catch((error: unknown) => {
          console.error("[generate-ticket/stream] Erro ao salvar no Firestore:", error);
        });
      }

      // Capturar o conteúdo completo para armazenar no cache
      let fullContent = '';
      const originalStream = stream.toReadableStream();
      
      // Criar um TransformStream para capturar o conteúdo enquanto é enviado
      const transformStream = new TransformStream({
        transform(chunk, controller) {
          try {
            // Decodificar o chunk e adicionar ao conteúdo completo
            const decoder = new TextDecoder();
            const text = decoder.decode(chunk);
            fullContent += text;
            
            // Passar o chunk adiante
            controller.enqueue(chunk);
          } catch (error) {
            console.error("[generate-ticket/stream] Erro ao processar chunk:", error);
            controller.error(error);
          }
        },
        flush(controller) {
          // Quando o stream terminar, armazenar no cache
          if (fullContent.length > 0) {
            // Armazenar em background para não bloquear a resposta
            setTimeout(() => {
              try {
                cacheTicket(sindicato, solicitacaoOriginal, fullContent);
                console.log("[generate-ticket/stream] Ticket armazenado no cache");
              } catch (error) {
                console.error("[generate-ticket/stream] Erro ao armazenar no cache:", error);
              }
            }, 0);
          }
        }
      });
      
      // Conectar os streams
      const readableStream = originalStream.pipeThrough(transformStream);
      
      // Retornar o stream transformado
      return new Response(readableStream, { headers });
    } catch (error: unknown) {
      console.error("[generate-ticket/stream] Erro na API OpenAI:", error);
      
      // Limpar o timeout se ainda estiver ativo
      if (timeoutId) clearTimeout(timeoutId);
      
      // Tentar com modelo alternativo em caso de falha
      try {
        // Tentar com o segundo modelo disponível
        const fallbackStream = await tryWithFallbackModel(prompt, systemPrompt, AVAILABLE_MODELS[1]);
        return new Response(fallbackStream.toReadableStream(), { headers });
      } catch (fallbackError) {
        console.error("[generate-ticket/stream] Erro no primeiro fallback:", fallbackError);
        
        // Tentar com o terceiro modelo se disponível
        try {
          if (AVAILABLE_MODELS.length > 2) {
            const secondFallbackStream = await tryWithFallbackModel(prompt, systemPrompt, AVAILABLE_MODELS[2]);
            return new Response(secondFallbackStream.toReadableStream(), { headers });
          }
          throw new Error("Sem mais modelos disponíveis");
        } catch (secondFallbackError) {
          console.error("[generate-ticket/stream] Todos os fallbacks falharam:", secondFallbackError);
          
          // Se falhar novamente, retornar uma mensagem de erro clara
          return new Response(
            "Não foi possível gerar o ticket no momento. Por favor, tente novamente mais tarde.",
            { status: 500, headers }
          );
        }
      }
    }
  } catch (error) {
    // Limpar o timeout se ainda estiver ativo
    if (timeoutId) clearTimeout(timeoutId);
    
    console.error("[generate-ticket/stream] Erro geral:", error);
    return new Response(
      "Ocorreu um erro ao processar sua solicitação. Por favor, tente novamente.",
      { status: 500, headers }
    );
  }
}