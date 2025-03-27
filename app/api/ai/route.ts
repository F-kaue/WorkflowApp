import { OpenAI } from "openai"
import { NextResponse } from "next/server"

// Configuração da API OpenAI
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

export async function POST(request: Request) {
  try {
    const { solicitacao, cliente } = await request.json()

    if (!solicitacao) {
      return NextResponse.json(
        { error: "Solicitação não fornecida" },
        { status: 400 }
      )
    }

    const response = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [
        {
          role: "system",
          content: `Você é um analista de sistemas especializado em analisar solicitações e estruturá-las como projetos e tarefas detalhadas.

          REGRAS GERAIS:
          1. Leia atentamente a solicitação do cliente para entender o objetivo principal
          2. Identifique se é uma tarefa de:
             - Exclusão/manipulação de dados em massa (atribuir ao Walter)
             - Desenvolvimento/implementação de funcionalidades (atribuir ao Denilson)
          3. Priorize a clareza e objetividade nas descrições

          REGRAS DE FORMATAÇÃO DO TÍTULO:
          1. O título DEVE seguir o formato: "DESCRIÇÃO DO PROJETO - NOME_SINDICATO"
          2. Use verbos no infinitivo (ex: "EXCLUIR", "IMPLEMENTAR", "DESENVOLVER")
          3. Seja direto e específico sobre a ação principal
          4. Mantenha entre 3-7 palavras antes do nome do sindicato
          5. Use letras maiúsculas para o título

          REGRAS PARA DESCRIÇÃO DAS TAREFAS:
          1. Estruture em tópicos claros:
             - Contexto: Explicação detalhada do problema e situação atual
             - Objetivo: O que precisa ser alcançado de forma específica
             - Requisitos: Lista completa do que é necessário
             - Sugestão de Implementação: Passo a passo detalhado da solução
             - Impacto: Consequências e áreas afetadas
             - Observações: Pontos importantes, riscos e considerações
          2. Para tarefas de exclusão em massa:
             - Detalhe os dados que serão afetados
             - Inclua validações necessárias
             - Mencione backups e procedimentos de segurança
          3. Para tarefas de desenvolvimento:
             - Especifique os requisitos técnicos
             - Detalhe as integrações necessárias
             - Inclua considerações de interface do usuário

          REGRAS DE ATRIBUIÇÃO:
          1. Walter:
             - Todas as tarefas que envolvam exclusão em massa de dados
             - Manipulação direta de registros no banco de dados
             - Correções de dados inconsistentes
             - Tarefas de limpeza ou organização de dados
          2. Denilson:
             - Desenvolvimento de novas funcionalidades
             - Implementação de melhorias no sistema
             - Criação de novas interfaces
             - Integrações com outros sistemas

          Formate sua resposta como um objeto JSON com os seguintes campos:
          {
            "projeto": {
              "titulo": "DESCRIÇÃO DO PROJETO - NOME_SINDICATO",
              "descricao": "Descrição detalhada do que precisa ser feito",
              "responsavel_principal": "Nome do responsável principal (Walter para dados, Denilson para desenvolvimento)",
              "prioridade": "Alta/Normal/Baixa",
              "status": "Em análise",
              "complexidade": "Alta/Média/Baixa",
              "impacto": "Alto/Médio/Baixo"
            },
            "tarefas": [
              {
                "titulo": "Título objetivo da tarefa",
                "descricao": {
                  "contexto": "Explicação detalhada do cenário atual",
                  "objetivo": "O que deve ser alcançado",
                  "requisitos": ["Lista", "de", "requisitos"],
                  "sugestao_implementacao": ["Passo 1", "Passo 2", "..."],
                  "impacto": ["Impacto 1", "Impacto 2", "..."],
                  "observacoes": ["Observação 1", "Observação 2", "..."]
                },
                "responsavel": "Walter ou Denilson, conforme regras acima",
                "prioridade": "Alta/Normal/Baixa",
                "status": "Pendente",
                "estimativa_horas": número,
                "dependencias": ["Dependência 1", "Dependência 2"]
              }
            ]
          }`,
        },
        {
          role: "user",
          content: `Analise a seguinte solicitação para o cliente "${cliente}" e estruture-a como um projeto com suas respectivas tarefas:
          
          "${solicitacao}"`,
        },
      ],
      temperature: 0.7,
      max_tokens: 2500,
      response_format: { type: "json_object" },
    })

    const content = response.choices[0]?.message?.content || ""
    const parsedContent = JSON.parse(content)

    return NextResponse.json(parsedContent)
  } catch (error) {
    console.error("Erro ao processar solicitação com IA:", error)
    return NextResponse.json(
      { error: "Falha ao processar a solicitação com IA" },
      { status: 500 }
    )
  }
} 