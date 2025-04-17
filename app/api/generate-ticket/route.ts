import { NextResponse } from "next/server";
import OpenAI from "openai";
import { adminDb } from "@/lib/firebase-admin-server";
import { determinarResponsavel } from "@/lib/utils";

// Configurações importantes para o Vercel
export const maxDuration = 60; // Limitado a 60 segundos (1 minuto) para compatibilidade com o plano hobby do Vercel
export const dynamic = 'force-dynamic'; // Garante que a rota seja tratada como dinâmica

// Configuração do cliente OpenAI com retentativas otimizados para o plano hobby do Vercel
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
  timeout: 30000, // 30 segundos de timeout
  maxRetries: 2,
  defaultHeaders: {
    "OpenAI-Beta": "assistants=v1",
    "User-Agent": "SindSystem-WorkflowApp/1.0"
  }
});

// Modelos disponíveis em ordem de preferência
const AVAILABLE_MODELS = [
  "gpt-4-turbo-preview",
  "gpt-4",
  "gpt-3.5-turbo-16k",
  "gpt-3.5-turbo"
];

// Função para esperar um tempo específico
const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// Função para tentar executar uma operação com retentativas
async function withRetry<T>(operation: () => Promise<T>, maxRetries = 2, initialDelay = 1000): Promise<T> {
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
      
      // Se for um erro de timeout ou abort, não tente novamente
      if (error instanceof Error && 
          (error.name === 'AbortError' || 
           error.message.includes('Request was aborted') || 
           error.message.includes('timeout'))) {
        console.log(`[generate-ticket] Erro de timeout/abort detectado, não tentando novamente`);
        throw error; // Propaga o erro imediatamente
      }
      
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
      
      // Aguardar um pouco antes de tentar o próximo modelo
      await sleep(1000);
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
      console.log("[generate-ticket] Corpo da requisição recebido:", JSON.stringify(requestBody));
      
      // Verificar se o corpo da requisição é um objeto
      if (!requestBody || typeof requestBody !== 'object') {
        console.error("[generate-ticket] Corpo da requisição inválido: não é um objeto");
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
      
      console.log("[generate-ticket] Campos extraídos:", {
        sindicato: sindicato ? (typeof sindicato === 'string' ? sindicato : typeof sindicato) : 'undefined',
        solicitacaoOriginal: solicitacaoOriginal ? 
          (typeof solicitacaoOriginal === 'string' ? 
            (solicitacaoOriginal.length > 20 ? 
              solicitacaoOriginal.substring(0, 20) + '...' : 
              solicitacaoOriginal) : 
            typeof solicitacaoOriginal) : 
          'undefined'
      });

      // Validar tipo e presença dos campos obrigatórios
      if (!sindicato || typeof sindicato !== 'string' || sindicato.trim().length === 0) {
        console.error("[generate-ticket] Campo 'sindicato' inválido ou ausente");
        return NextResponse.json(
          { 
            success: false,
            error: "Campo 'sindicato' é obrigatório e deve ser uma string não vazia",
            details: {
              received: sindicato ? typeof sindicato : 'undefined',
              timestamp: new Date().toISOString()
            }
          },
          { status: 400, headers }
        );
      }
      
      if (!solicitacaoOriginal || typeof solicitacaoOriginal !== 'string' || solicitacaoOriginal.trim().length === 0) {
        console.error("[generate-ticket] Campo 'solicitacaoOriginal' inválido ou ausente");
        return NextResponse.json(
          { 
            success: false,
            error: "Campo 'solicitacaoOriginal' é obrigatório e deve ser uma string não vazia",
            details: {
              received: solicitacaoOriginal ? typeof solicitacaoOriginal : 'undefined',
              timestamp: new Date().toISOString()
            }
          },
          { status: 400, headers }
        );
      }
    } catch (parseError) {
      console.error("[generate-ticket] Erro ao parsear o corpo da requisição:", parseError);
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

    console.log("[generate-ticket] Dados recebidos:", {
      sindicato,
      solicitacaoOriginalLength: solicitacaoOriginal.length
    });

    // Determinar o responsável principal com base no conteúdo da solicitação
    const responsavelPrincipal = determinarResponsavel(solicitacaoOriginal);
    console.log(`[generate-ticket] Responsável principal determinado: ${responsavelPrincipal}`);

    // Construção do prompt otimizado com formato estruturado e exemplo concreto
    const prompt = `Você é um especialista em gerenciamento de projetos para sindicatos. Crie um ticket detalhado seguindo EXATAMENTE o formato abaixo.

# Solicitação:
- Sindicato: ${sindicato}
- Descrição: ${solicitacaoOriginal}

# Formato do Ticket (SIGA EXATAMENTE ESTE FORMATO):

## ${sindicato} - [TÍTULO DO PROJETO CLARO E DESCRITIVO]

### Descrição de Projeto:
[Descrição detalhada do projeto, incluindo contexto, necessidades e objetivos. Seja específico e técnico. Mínimo de 3 parágrafos.]

### Duração Total Estimada: [Período estimado], dependendo do porte da entidade e da complexidade da implementação.

### FASE 1 – [Nome da Fase]

#### [TÍTULO DESCRITIVO DA TAREFA - Seja específico]
• Descrição detalhada da tarefa: [Explique o contexto, importância e objetivo desta tarefa específica]
• Passos específicos de implementação: [Liste em detalhes o que precisa ser feito]
• Critérios de aceitação: [Defina claramente como verificar se a tarefa foi concluída com sucesso]

#### [TÍTULO DESCRITIVO DA TAREFA - Seja específico]
• Descrição detalhada da tarefa: [Explique o contexto, importância e objetivo desta tarefa específica]
• Passos específicos de implementação: [Liste em detalhes o que precisa ser feito]
• Critérios de aceitação: [Defina claramente como verificar se a tarefa foi concluída com sucesso]

### FASE 2 – [Nome da Fase]

#### [TÍTULO DESCRITIVO DA TAREFA - Seja específico]
• Descrição detalhada da tarefa: [Explique o contexto, importância e objetivo desta tarefa específica]
• Passos específicos de implementação: [Liste em detalhes o que precisa ser feito]
• Critérios de aceitação: [Defina claramente como verificar se a tarefa foi concluída com sucesso]

#### [TÍTULO DESCRITIVO DA TAREFA - Seja específico]
• Descrição detalhada da tarefa: [Explique o contexto, importância e objetivo desta tarefa específica]
• Passos específicos de implementação: [Liste em detalhes o que precisa ser feito]
• Critérios de aceitação: [Defina claramente como verificar se a tarefa foi concluída com sucesso]

### Responsáveis:
- Responsável Principal: ${responsavelPrincipal}
- Desenvolvimento: Denilson
- Banco de Dados: Walter

### Prioridade: [Alta/Média/Baixa]
[Justificativa da prioridade em 1-2 frases]

### Requisitos Técnicos:
• [Lista de requisitos técnicos específicos]
• [Tecnologias necessárias]
• [Integrações necessárias]

### Observações Importantes:
• [Observações críticas para o sucesso do projeto]
• [Riscos potenciais e mitigações]
• [Dependências externas]

# EXEMPLO DE FORMATO (SIGA ESTE PADRÃO):

## SINDICATO - Atualização dos Tipos de Documentos em Associados

### Descrição de Projeto:
Este projeto tem como objetivo realizar a atualização dos tipos de documentos disponíveis no campo "Descrição de Documento" dentro do módulo Associados / Documentos. A ação incluirá a remoção de todos os tipos de documentos adicionados na data de hoje e a manutenção apenas dos tipos específicos definidos.

A implementação visa padronizar e simplificar o processo de documentação, garantindo que apenas os documentos permitidos permaneçam disponíveis no sistema. Isso proporcionará maior organização e eficiência no gerenciamento de documentos associados.

Além disso, o projeto prevê a possibilidade de inclusão futura de outros tipos de documentos conforme a necessidade das atividades da organização. O processo será realizado de forma segura, garantindo que apenas os documentos permitidos permaneçam disponíveis e que ajustes possam ser feitos conforme necessário.

### Duração Total Estimada: Curto prazo, dependendo da complexidade da estrutura de dados existente.

### FASE 1 – Análise e Preparação

#### Levantamento dos Tipos de Documentos Atuais - Mapeamento Completo
• Descrição detalhada da tarefa: Esta tarefa envolve o levantamento completo de todos os tipos de documentos atualmente disponíveis no campo "Descrição de Documento" do módulo Associados / Documentos. É fundamental para o projeto, pois permitirá identificar quais documentos foram adicionados recentemente e quais devem ser mantidos ou removidos conforme as novas diretrizes.
• Passos específicos de implementação: 1) Acessar o banco de dados e extrair a lista completa de tipos de documentos; 2) Identificar a data de criação de cada tipo de documento; 3) Classificar os documentos por data de criação; 4) Criar um relatório detalhado dos tipos existentes; 5) Validar com os stakeholders a lista de documentos a serem mantidos.
• Critérios de aceitação: Relatório completo gerado com todos os tipos de documentos; Documentos corretamente classificados por data; Lista validada pelos stakeholders responsáveis.

#### Backup dos Dados Atuais - Segurança da Informação
• Descrição detalhada da tarefa: Esta tarefa consiste na criação de um backup completo dos dados atuais antes de realizar qualquer modificação. É uma medida de segurança essencial para garantir que, em caso de problemas durante a implementação, seja possível restaurar o sistema ao estado anterior sem perda de informações.
• Passos específicos de implementação: 1) Desenvolver script de backup específico para a tabela de tipos de documentos; 2) Executar o backup em ambiente seguro; 3) Verificar a integridade do backup realizado; 4) Documentar o processo de backup e restauração; 5) Armazenar o backup em local seguro com controle de versão.
• Critérios de aceitação: Backup realizado com sucesso; Verificação de integridade concluída; Documentação do processo finalizada; Backup armazenado em local seguro e acessível.

### FASE 2 – Implementação e Validação

#### Atualização dos Tipos de Documentos - Implementação das Mudanças
• Descrição detalhada da tarefa: Nesta tarefa será realizada a exclusão de todos os tipos de documentos adicionados na data de hoje no campo "Descrição de Documento" do módulo Associados / Documentos, mantendo apenas os tipos especificados (DOCUMENTO DE INCLUSÃO, DOCUMENTO DE CANCELAMENTO) e criando o novo tipo (DOCUMENTO DE ALTERAÇÃO).
• Passos específicos de implementação: 1) Desenvolver script SQL para remoção segura dos tipos de documentos adicionados hoje; 2) Verificar a existência dos tipos que devem ser mantidos; 3) Criar o novo tipo "DOCUMENTO DE ALTERAÇÃO" caso não exista; 4) Executar o script em ambiente de homologação para validação; 5) Após validação, aplicar as alterações no ambiente de produção.
• Critérios de aceitação: Remoção bem-sucedida dos tipos de documentos adicionados hoje; Confirmação da existência dos três tipos especificados; Ausência de erros durante a execução do script; Validação da integridade referencial do banco de dados.

#### Testes e Documentação - Garantia de Qualidade
• Descrição detalhada da tarefa: Esta tarefa envolve a realização de testes abrangentes para garantir que as alterações foram implementadas corretamente e a criação de documentação detalhada sobre as mudanças realizadas. É essencial para garantir a qualidade da implementação e facilitar futuras manutenções.
• Passos específicos de implementação: 1) Desenvolver casos de teste para validar as alterações; 2) Testar a criação de novos documentos com os tipos permitidos; 3) Verificar se não é possível criar documentos com tipos não permitidos; 4) Documentar todas as alterações realizadas; 5) Atualizar a documentação do sistema; 6) Criar guia para adição de novos tipos no futuro.
• Critérios de aceitação: Todos os testes executados com sucesso; Documentação completa e detalhada das alterações; Guia de procedimentos para adição futura de novos tipos; Aprovação final dos stakeholders.

### Responsáveis:
- Responsável Principal: Walter
- Desenvolvimento: Denilson
- Banco de Dados: Walter

### Prioridade: Média
A padronização dos tipos de documentos é importante para a organização e eficiência do sistema, impactando diretamente na qualidade dos dados e na experiência do usuário.

### Requisitos Técnicos:
• Acesso ao banco de dados do sistema
• Conhecimento da estrutura de dados do módulo Associados / Documentos
• Scripts SQL para manipulação segura dos dados
• Ambiente de homologação para testes
• Ferramentas de backup e restauração

### Observações Importantes:
• Realizar o backup completo antes de iniciar qualquer alteração
• Executar as alterações fora do horário de pico de utilização do sistema
• Comunicar aos usuários sobre a padronização dos tipos de documentos
• Prever processo para adição de novos tipos de documentos no futuro conforme necessidade`;

    console.log("[generate-ticket] Prompt construído. Tamanho:", prompt.length);

    // Controle de timeout manual ajustado para o limite do Vercel
    const controller = new AbortController();
    const timeout = setTimeout(() => {
      console.log("[generate-ticket] Timeout atingido, abortando requisição...");
      controller.abort("Timeout excedido");
    }, 45000); // 45s timeout (ajustado para aproveitar melhor o limite do Vercel)

    try {
      // A variável feedbackData já foi inicializada no início da função
      console.log("[generate-ticket] Iniciando chamada à API OpenAI com sistema de retentativas e fallback...");
      
      const messages = [
        {
          role: "system" as const,
          content: `Você é um assistente especializado em criar tickets técnicos para sindicatos. 

INSTRUÇÕES IMPORTANTES:
1. Siga EXATAMENTE o formato solicitado no prompt do usuário
2. Use linguagem técnica e detalhada
3. Para tarefas relacionadas a banco de dados, exclusão em massa, relatórios ou dados, atribua ao Walter
4. Para tarefas de desenvolvimento e implementação, atribua ao Denilson
5. Crie títulos no formato "SINDICATO - Título do Projeto"
6. Estruture o documento com clara distinção entre PROJETO e TAREFAS

FOCO NA ESTRUTURA (MUITO IMPORTANTE):
7. Destaque claramente o que é PROJETO (descrição geral, objetivos, contexto) e o que são TAREFAS (ações específicas)
8. Não inclua referências a dias específicos nas fases, mantenha apenas os nomes das fases
9. Crie TÍTULOS DESCRITIVOS E ESPECÍFICOS para cada tarefa (não use nomes genéricos)
10. Escreva DESCRIÇÕES DETALHADAS para cada tarefa que expliquem:
    - O contexto e importância da tarefa
    - O objetivo específico a ser alcançado
    - Como esta tarefa se relaciona com o projeto como um todo
11. Liste PASSOS DE IMPLEMENTAÇÃO específicos e técnicos para cada tarefa
12. Defina CRITÉRIOS DE ACEITAÇÃO claros e verificáveis para cada tarefa

Lembre-se: A clara distinção entre PROJETO e TAREFAS é essencial, e as tarefas devem ser extremamente detalhadas para que os funcionários entendam exatamente o que fazer.`
        },
        { role: "user" as const, content: prompt }
      ];
      
      // Reduzir a complexidade do prompt para diminuir o tempo de resposta
      const simplifiedPrompt = prompt.length > 4000 ? prompt.substring(0, 4000) : prompt;
      const simplifiedMessages = [
        messages[0], // Manter a instrução do sistema
        { role: "user" as const, content: simplifiedPrompt }
      ];
      
      console.log("[generate-ticket] Tamanho do prompt original:", prompt.length);
      console.log("[generate-ticket] Tamanho do prompt simplificado:", simplifiedPrompt.length);
      console.log("[generate-ticket] Reduzindo complexidade do prompt para melhorar desempenho");
      
      // Primeiro tentamos com o sistema de retentativas otimizado para velocidade
      const completion = await withRetry(async () => {
        console.log("[generate-ticket] Tentando chamada à API OpenAI...");
        try {
          // Usando configurações mais conservadoras para evitar timeout
          return await openai.chat.completions.create({
            model: AVAILABLE_MODELS[0], // Usa o modelo mais avançado (gpt-4-turbo-preview) para respostas mais detalhadas
            messages: simplifiedMessages,
            temperature: 0.5, // Reduzido ainda mais para respostas mais diretas e rápidas
            max_tokens: 1200, // Reduzido para diminuir o tempo de resposta
          }, { signal: controller.signal });
        } catch (error) {
          // Se falhar com o modelo principal, tenta com os modelos alternativos
          if (error instanceof OpenAI.APIError && 
              (error.code === 'model_not_available' || error.status === 404)) {
            console.log("[generate-ticket] Modelo principal não disponível, tentando modelos alternativos...");
            return await tryWithDifferentModels(simplifiedMessages, 1500, controller); // Reduzido para 1500 tokens
          }
          throw error; // Propaga o erro para ser tratado pelo withRetry
        }
      }, 3, 1000); // 3 tentativas com 1s de espera inicial

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

      // Obter o ID do ticket salvo no Firestore (se disponível)
      let ticketId = null;
      try {
        if (adminDb) {
          // Removida a funcionalidade de feedback, simplificando o objeto de dados
          const ticketData = {
            content,
            sindicato,
            solicitacaoOriginal,
            responsavelPrincipal,
            timestamp: new Date().toISOString()
            // Campos relacionados a feedback removidos
          };
          
          const ticketRef = await adminDb.collection("generated_tickets").add(ticketData);
          ticketId = ticketRef.id;
          console.log("[generate-ticket] Ticket salvo no Firestore com ID:", ticketId);
        } else {
          console.log("[generate-ticket] adminDb não está disponível, pulando salvamento do ticket");
        }
      } catch (firestoreError) {
        // Apenas logar o erro, não interromper o fluxo principal
        console.error("[generate-ticket] Erro ao salvar ticket no Firestore:", firestoreError);
      }

      console.log("[generate-ticket] Ticket gerado com sucesso");
      return NextResponse.json(
        { 
          success: true,
          ticket: content,
          ticketGerado: content, // Adicionando a propriedade ticketGerado que o frontend espera
          ticketId: ticketId, // Incluir o ID do ticket na resposta para permitir feedback
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
            error: "Erro na API OpenAI: Request was aborted.",
            details: {
              type: "timeout_error",
              message: "A solicitação foi interrompida devido ao tempo limite. Por favor, tente novamente com uma descrição mais curta ou mais tarde quando o serviço estiver menos sobrecarregado.",
              timestamp: new Date().toISOString()
            },
            userMessage: "O tempo de resposta excedeu o limite. Tente novamente com uma descrição mais curta ou mais tarde."
          },
          { status: 504, headers } // 504 Gateway Timeout
        );
      } else if (error instanceof Error && error.message.includes("Request was aborted")) {
        console.error("[generate-ticket] Requisição abortada por timeout ou outro motivo");
        return NextResponse.json(
          { 
            success: false,
            error: "Erro na API OpenAI: Request was aborted.",
            details: {
              type: "abort_error",
              message: "A solicitação foi interrompida. Por favor, tente novamente com uma descrição mais curta ou mais tarde quando o serviço estiver menos sobrecarregado.",
              timestamp: new Date().toISOString()
            },
            userMessage: "A solicitação foi interrompida. Tente novamente com uma descrição mais curta ou mais tarde."
          },
          { status: 504, headers } // 504 Gateway Timeout
        );
      }

      return NextResponse.json(
        { 
          success: false,
          error: "Erro interno ao processar a solicitação",
          details: {
            type: "internal_error",
            message: error instanceof Error ? error.message : String(error),
            timestamp: new Date().toISOString()
          },
          userMessage: "Ocorreu um erro ao gerar o ticket. Por favor, tente novamente mais tarde."
        },
        { status: 500, headers }
      );
    }

  } catch (error) {
    console.error("[generate-ticket] Erro durante o processamento:", error);
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
        userMessage: "Ocorreu um erro ao gerar o ticket. Por favor, tente novamente com uma descrição mais curta ou mais tarde."
      },
      { status: 500, headers }
    );
  }
}