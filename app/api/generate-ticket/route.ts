import { NextResponse } from "next/server"
import OpenAI from "openai"

// Configuração de timeout para o Vercel (máximo 30 segundos no plano Hobby)
export const maxDuration = 30

// Tipo para os detalhes de erro com tratamento explícito de null
type ErrorDetails = {
  type: string
  timestamp: string
  status?: number
  code?: string | null
  request_id?: string | null
  headers?: Record<string, string> | null
  stack?: string
  finish_reason?: string
}

export async function POST(request: Request) {
  // Log de início do processo
  console.log("[generate-ticket] Iniciando processamento da requisição")

  // Verificação da API Key da OpenAI
  if (!process.env.OPENAI_API_KEY) {
    console.error("[generate-ticket] Erro: OPENAI_API_KEY não está configurada")
    return NextResponse.json(
      { 
        success: false,
        error: "Configuração do serviço de IA incompleta",
        details: {
          type: "missing_api_key",
          timestamp: new Date().toISOString()
        }
      },
      { status: 500 }
    )
  }

  try {
    // Parse e validação do corpo da requisição
    let sindicato: string, solicitacaoOriginal: string
    try {
      const requestBody = await request.json()
      sindicato = requestBody.sindicato as string
      solicitacaoOriginal = requestBody.solicitacaoOriginal as string

      if (!sindicato || !solicitacaoOriginal) {
        console.error("[generate-ticket] Dados incompletos na requisição:", { 
          sindicato: sindicato || 'não fornecido',
          solicitacaoOriginal: solicitacaoOriginal ? 'fornecido' : 'não fornecido'
        })
        return NextResponse.json(
          { 
            success: false,
            error: "Dados incompletos",
            details: {
              type: "incomplete_data",
              timestamp: new Date().toISOString()
            }
          },
          { status: 400 }
        )
      }
    } catch (parseError) {
      console.error("[generate-ticket] Erro ao parsear o corpo da requisição:", parseError)
      return NextResponse.json(
        { 
          success: false,
          error: "Formato de requisição inválido",
          details: {
            type: "invalid_json",
            timestamp: new Date().toISOString()
          }
        },
        { status: 400 }
      )
    }

    // Log dos dados recebidos
    console.log("[generate-ticket] Dados recebidos:", {
      sindicato,
      solicitacaoOriginalLength: solicitacaoOriginal.length
    })

    // Inicialização do cliente OpenAI
    const openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
      timeout: 25000,
      maxRetries: 2,
    })

    // Construção do prompt detalhado
    const prompt = `Você é um especialista em gerenciamento de projetos para sindicatos. Com base na solicitação abaixo, gere um ticket detalhado seguindo rigorosamente este formato:

# ${sindicato} - [TÍTULO DO PROJETO]

## Descrição do Projeto
[Descreva claramente o contexto, necessidades e objetivos. Seja detalhado mas conciso.]

## Visão Geral do Problema
[Explique o problema principal, seu impacto e importância para o sindicato]

## Tarefas (Mínimo 3)

### Tarefa 1: [NOME DA TAREFA]
- **Descrição**: [Detalhe o que precisa ser feito]
- **Passos**: [Liste as ações específicas]
- **Critérios de Aceitação**: [Como saberemos que está completo]
- **Responsável**: [Denilson para desenvolvimento/Walter para banco de dados]

### Tarefa 2: [NOME DA TAREFA]
- **Descrição**: [Detalhe o que precisa ser feito]
- **Passos**: [Liste as ações específicas]
- **Critérios de Aceitação**: [Como saberemos que está completo]
- **Responsável**: [Denilson para desenvolvimento/Walter para banco de dados]

### Tarefa 3: [NOME DA TAREFA]
- **Descrição**: [Detalhe o que precisa ser feito]
- **Passos**: [Liste as ações específicas]
- **Critérios de Aceitação**: [Como saberemos que está completo]
- **Responsável**: [Denilson para desenvolvimento/Walter para banco de dados]

## Prazos
- **Início**: [Data sugerida no formato DD/MM/AAAA]
- **Conclusão**: [Data estimada no formato DD/MM/AAAA]
- **Marcos**: [Entregas parciais importantes com datas]

## Prioridade
[Alta/Média/Baixa] - [Justifique com base no impacto para o sindicato]

## Requisitos Técnicos
[Ferramentas, sistemas e integrações necessárias]

## Observações
[Riscos, dependências ou informações adicionais]

Solicitação original:
${solicitacaoOriginal}`

    console.log("[generate-ticket] Prompt construído. Tamanho:", prompt.length)

    // Chamada à API OpenAI
    let completion
    try {
      console.log("[generate-ticket] Chamando API OpenAI...")
      completion = await openai.chat.completions.create({
        model: "gpt-4-turbo-preview",
        messages: [
          {
            role: "system",
            content: `Você é um assistente especializado em criar tickets técnicos para sindicatos. Siga estas regras rigorosamente:
1. Analise profundamente a solicitação para extrair todos os detalhes relevantes
2. Crie um título claro e descritivo que resuma o projeto
3. Divida em pelo menos 3 tarefas específicas e acionáveis
4. Atribua responsáveis conforme:
   - Denilson: Desenvolvimento de software, interfaces, correção de bugs
   - Walter: Banco de dados, SQL, migrações, exclusão em massa
5. Defina prazos realistas considerando a complexidade
6. Justifique a prioridade baseada no impacto operacional
7. Seja extremamente organizado e detalhado em cada seção
8. Mantenha linguagem técnica porém acessível
9. Inclua todos os requisitos técnicos necessários
10. Destaque riscos e dependências importantes`
          },
          {
            role: "user",
            content: prompt
          }
        ],
        temperature: 0.7,
        max_tokens: 2000,
      })
      console.log("[generate-ticket] Resposta da OpenAI recebida. Status:", completion?.choices?.[0]?.finish_reason)
    } catch (apiError) {
      console.error("[generate-ticket] Erro na chamada à API OpenAI:", apiError)
      throw apiError
    }

    // Validação da resposta da OpenAI
    const content = completion?.choices?.[0]?.message?.content
    if (!content) {
      console.error("[generate-ticket] Resposta inesperada da OpenAI:", completion)
      return NextResponse.json(
        { 
          success: false,
          error: "Resposta inesperada do serviço de IA",
          details: {
            type: "empty_response",
            timestamp: new Date().toISOString(),
            finish_reason: completion?.choices?.[0]?.finish_reason || 'unknown'
          }
        },
        { status: 500 }
      )
    }

    console.log("[generate-ticket] Ticket gerado com sucesso. Tamanho:", content.length)

    // Resposta de sucesso
    return NextResponse.json({ 
      success: true,
      ticket: content,
      metadata: {
        model: completion.model,
        tokens_used: completion.usage?.total_tokens || 0,
        created: new Date((completion.created || 0) * 1000).toISOString()
      }
    })

  } catch (error: unknown) {
    // Tratamento de erros completo
    console.error("[generate-ticket] Erro durante o processamento:", error)

    const errorDetails: ErrorDetails = {
      type: "unknown_error",
      timestamp: new Date().toISOString()
    }

    if (error instanceof OpenAI.APIError) {
      errorDetails.type = "openai_api_error"
      errorDetails.status = error.status || undefined
      errorDetails.code = error.code || null
      errorDetails.request_id = error.request_id || null
      
      if (process.env.NODE_ENV === 'development') {
        errorDetails.headers = error.headers || null
      }
      
      return NextResponse.json(
        { 
          success: false,
          error: `Erro no serviço de IA: ${error.message}`,
          details: errorDetails
        },
        { status: error.status || 500 }
      )
    }

    if (error instanceof Error && (error.name === 'AbortError' || error.name === 'TimeoutError')) {
      errorDetails.type = "timeout_error"
      return NextResponse.json(
        { 
          success: false,
          error: "Tempo limite excedido ao processar a requisição",
          details: errorDetails
        },
        { status: 504 }
      )
    }

    if (error instanceof Error) {
      errorDetails.type = "application_error"
      if (process.env.NODE_ENV === 'development') {
        errorDetails.stack = error.stack || undefined
      }
      return NextResponse.json(
        { 
          success: false,
          error: error.message,
          details: errorDetails
        },
        { status: 500 }
      )
    }

    return NextResponse.json(
      { 
        success: false,
        error: "Erro desconhecido ao gerar ticket",
        details: errorDetails
      },
      { status: 500 }
    )
  }
}