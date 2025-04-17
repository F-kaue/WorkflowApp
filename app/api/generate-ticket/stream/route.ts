import { NextRequest } from "next/server";
import OpenAI from "openai";

// Configurações importantes para o Vercel
export const maxDuration = 300; // Aumentado para 5 minutos
export const dynamic = 'force-dynamic';

// Configuração do cliente OpenAI
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
  maxRetries: 2,
  timeout: 60000, // Aumentado para 60 segundos
});

// Função para criar um encoder uma vez
const encoder = new TextEncoder();

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
    
    const { sindicato, solicitacaoOriginal } = requestBody;
    
    if (!sindicato || !solicitacaoOriginal) {
      throw new Error("Campos 'sindicato' e 'solicitacaoOriginal' são obrigatórios");
    }

    // Construir o prompt
    const systemPrompt = `Você é um especialista em análise e documentação técnica, com profundo conhecimento do sistema próprio do sindicato. Você aprende constantemente sobre o sistema através das interações e informações fornecidas ao assistente IA.

INSTRUÇÕES IMPORTANTES:

1. ESTRUTURA DO TÍTULO:
- Use sempre o formato: [NOME DO SINDICATO] - [TÍTULO RESUMIDO DO PROJETO]
- O título deve ser conciso e relacionado ao módulo/funcionalidade específica
- Referencie módulos existentes quando aplicável

2. DESCRIÇÃO DO PROJETO:
- Contextualize a solicitação dentro do sistema existente
- Referencie módulos e funcionalidades já implementadas
- Indique claramente o impacto nas funcionalidades atuais
- Mantenha foco na integração com o sistema atual

3. TAREFAS:
Considere que a equipe tem profundo conhecimento do sistema. Cada tarefa deve:
- Ter título claro referenciando o módulo/funcionalidade
- Fornecer descrição técnica que:
  • Contextualize a mudança no sistema atual
  • Referencie componentes e padrões existentes
  • Indique apenas o que precisa ser modificado/adicionado
  • Mencione integrações com módulos existentes
  • Foque nas alterações específicas necessárias

ATRIBUIÇÃO DE RESPONSÁVEIS:
- Denilson (Desenvolvimento):
  • Conhece toda a estrutura front-end
  • Domina os padrões de componentes existentes
  • Gerencia integrações e APIs do sistema
  • Responsável por UI/UX e experiência do usuário

- Walter (Banco de Dados):
  • Especialista na estrutura do banco de dados
  • Domina procedures e queries existentes
  • Gerencia operações em massa e otimizações
  • Responsável por integridade e performance dos dados

4. EXEMPLO DE DESCRIÇÃO TÉCNICA BOA:
"Realizar exclusão em massa dos boletos vencidos há mais de 5 anos na base de dados. Utilizar a procedure existente 'sp_LimparBoletos' ajustando o parâmetro @AnosAntigos para 5. Executar primeiro no ambiente de homologação seguindo o protocolo padrão de limpeza. Após validação, agendar a execução em produção para horário de menor movimento. Seguir processo de backup incremental antes da operação."

5. EXEMPLO DE DESCRIÇÃO TÉCNICA RUIM:
"Criar nova procedure para deletar boletos antigos do banco de dados. Será necessário criar queries para identificar boletos, fazer validações de datas e implementar lógica de exclusão em lotes."

6. DIRETRIZES GERAIS:
- Considere sempre o conhecimento existente da equipe
- Referencie componentes e padrões já estabelecidos
- Foque nas alterações específicas necessárias
- Evite explicar o que a equipe já sabe
- Mantenha contexto do sistema existente`;
    
    const prompt = `Crie um ticket técnico detalhado para o sindicato ${sindicato} com a seguinte solicitação: ${solicitacaoOriginal}.

O ticket deve seguir EXATAMENTE esta estrutura:

# ${sindicato} - [TÍTULO RESUMIDO DO PROJETO]

## Descrição do Projeto
[Descreva o objetivo contextualizando no sistema atual, indicando módulos afetados e impacto nas funcionalidades existentes]

## Tarefas Identificadas

### Tarefa 1: ${sindicato} - [TÍTULO ESPECÍFICO DO MÓDULO/FUNCIONALIDADE]
**Descrição Técnica:**
[Forneça descrição técnica focada nas alterações necessárias, referenciando componentes existentes e padrões do sistema. Seja específico sobre o que precisa ser modificado/adicionado, assumindo o conhecimento da equipe sobre o sistema.]

**Responsável:** [Denilson/Walter baseado na especialidade]

[Repita a estrutura acima para cada tarefa adicional necessária]

## Observações Técnicas
• [Observações relevantes sobre impacto no sistema atual]
• [Cuidados específicos com integrações existentes]
• [Requisitos de compatibilidade com módulos atuais]`;

    // Criar um ReadableStream para enviar a resposta
    const stream = new ReadableStream({
      async start(controller) {
        try {
          const completion = await openai.chat.completions.create({
            model: "gpt-3.5-turbo",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: prompt }
        ],
            temperature: 0.7,
            max_tokens: 2000,
            stream: true,
          });

          for await (const chunk of completion) {
            const content = chunk.choices[0]?.delta?.content || '';
            if (content) {
              controller.enqueue(encoder.encode(content));
            }
          }
          
          controller.close();
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
    console.error("Erro na geração do ticket:", error);

    // Se for um erro da OpenAI
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

    // Para outros tipos de erro
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : "Erro interno ao gerar ticket",
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