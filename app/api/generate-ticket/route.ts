import { NextResponse } from "next/server"
import OpenAI from "openai"

// Importar o cliente OpenAI do arquivo local
// Como o cliente não é exportado diretamente, vamos usar a variável local
let openai: OpenAI | null = null

// Inicializar o cliente OpenAI
if (process.env.OPENAI_API_KEY) {
  try {
    openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    })
  } catch (error) {
    console.error('Erro ao inicializar cliente OpenAI:', error)
  }
}

export async function POST(request: Request) {
  try {
    const { sindicato, solicitacaoOriginal } = await request.json()

    if (!sindicato || !solicitacaoOriginal) {
      return NextResponse.json(
        { error: "Sindicato e solicitação são obrigatórios" },
        { status: 400 }
      )
    }

    const prompt = `
Gere um ticket detalhado para a seguinte solicitação do sindicato ${sindicato}:

${solicitacaoOriginal}

O ticket deve seguir o seguinte formato em Markdown, sendo extremamente detalhado e organizado:

# ${sindicato} - [Título do Projeto]

## Descrição do Projeto
[Descreva o projeto de forma clara, detalhada e objetiva, explicando o contexto, a necessidade e os objetivos]

## Visão Geral do Problema
[Apresente uma visão geral do problema a ser resolvido, incluindo o impacto atual e a importância da solução]

## Tarefas

### Tarefa 1: [Título da Tarefa]
- **Descrição**: [Descrição detalhada da tarefa]
- **Passos necessários**: [Liste os passos específicos para execução]
- **Critérios de aceitação**: [Defina os critérios para considerar a tarefa concluída]
- **Responsável**: [Atribua ao Denilson se for tarefa de desenvolvimento, ou ao Walter se for relacionada a dados, exclusão em massa ou banco de dados]

### Tarefa 2: [Título da Tarefa]
- **Descrição**: [Descrição detalhada da tarefa]
- **Passos necessários**: [Liste os passos específicos para execução]
- **Critérios de aceitação**: [Defina os critérios para considerar a tarefa concluída]
- **Responsável**: [Atribua ao Denilson se for tarefa de desenvolvimento, ou ao Walter se for relacionada a dados, exclusão em massa ou banco de dados]

### Tarefa 3: [Título da Tarefa]
- **Descrição**: [Descrição detalhada da tarefa]
- **Passos necessários**: [Liste os passos específicos para execução]
- **Critérios de aceitação**: [Defina os critérios para considerar a tarefa concluída]
- **Responsável**: [Atribua ao Denilson se for tarefa de desenvolvimento, ou ao Walter se for relacionada a dados, exclusão em massa ou banco de dados]

## Prazos Estimados
- **Início sugerido**: [Data sugerida]
- **Prazo para conclusão**: [Data estimada]
- **Marcos importantes**: [Liste datas de entregas parciais importantes]

## Prioridade
[Alta/Média/Baixa] - [Justifique detalhadamente a prioridade com base no impacto para o sindicato]

## Requisitos Técnicos
[Liste todos os requisitos técnicos, ferramentas, sistemas e integrações necessárias]

## Observações Importantes
[Adicione quaisquer observações relevantes, riscos potenciais, dependências ou considerações especiais]

## Histórico de Solicitações Relacionadas
[Mencione se existem solicitações anteriores relacionadas a este projeto]
`

    // Verificar se o cliente OpenAI está disponível
    if (!openai) {
      return NextResponse.json(
        { error: "Serviço de IA não está disponível no momento. Verifique as configurações do ambiente." },
        { status: 503 }
      )
    }

    const completion = await openai.chat.completions.create({
      model: "gpt-4-turbo-preview",
      messages: [
        {
          role: "system",
          content: "Você é um especialista em gerenciamento de projetos e chamados técnicos para sindicatos. Sua função é criar tickets detalhados e bem estruturados que facilitem o entendimento e a execução pela equipe responsável. Baseie-se nas seguintes diretrizes:\n\n1. Analise cuidadosamente a solicitação original para extrair o máximo de informações relevantes\n2. Crie um título de projeto conciso mas descritivo que capture a essência da solicitação\n3. Divida o projeto em tarefas específicas e gerenciáveis (pelo menos 3 tarefas quando apropriado)\n4. Para cada tarefa, forneça descrições detalhadas, passos de execução claros e critérios de aceitação objetivos\n5. Atribua responsáveis seguindo estas regras específicas:\n   - Atribua ao Denilson todas as tarefas relacionadas a desenvolvimento de software, programação, implementação de código, criação de interfaces, correção de bugs e melhorias em funcionalidades existentes\n   - Atribua ao Walter todas as tarefas relacionadas a dados, banco de dados, exclusão em massa, migração de dados, consultas SQL, backup e restauração de dados\n6. Estabeleça prazos realistas e marcos importantes\n7. Justifique a prioridade com base no impacto para o sindicato\n8. Inclua todos os requisitos técnicos e observações importantes\n9. Mantenha uma linguagem profissional, clara e objetiva em todo o documento\n10. Organize as informações de forma lógica e hierárquica para facilitar a leitura e compreensão"
        },
        {
          role: "user",
          content: prompt
        }
      ],
      temperature: 0.7,
      max_tokens: 1500,
    })

    const ticketGerado = completion.choices[0].message.content

    return NextResponse.json({ ticketGerado })
  } catch (error) {
    console.error("Erro ao gerar ticket:", error)
    
    // Tratamento de erros mais específico
    let errorMessage = "Erro ao gerar ticket"
    let statusCode = 500
    
    // Verificação de tipo para o erro
    const errorWithResponse = error as { response?: { status: number; data?: any }; message?: string }
    
    if (errorWithResponse.response) {
      // Erro da API OpenAI
      errorMessage = `Erro da API OpenAI: ${errorWithResponse.response.status} - ${errorWithResponse.response.data?.error?.message || 'Sem detalhes'}`
      console.error("Detalhes do erro da API:", errorWithResponse.response.data)
    } else if (errorWithResponse.message) {
      // Erro com mensagem
      errorMessage = `Erro: ${errorWithResponse.message}`
    }
    
    return NextResponse.json(
      { error: errorMessage },
      { status: statusCode }
    )
  }
}
