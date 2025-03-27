import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";

export async function POST(request: Request) {
  try {
    const { 
      tipo,
      sindicato,
      descricao,
      dataInicio,
      dataFim,
      participantes
    } = await request.json();

    // Prompt base para gerar o projeto
    const prompt = `
    Com base nas seguintes informações:
    
    Tipo de Atendimento: ${tipo}
    Sindicato: ${sindicato}
    Data de Início: ${dataInicio}
    Data de Fim: ${dataFim}
    Número de Participantes: ${participantes?.length || 0}
    Descrição adicional: ${descricao || 'Não fornecida'}

    Por favor, gere:
    1. Um título claro e objetivo para o projeto
    2. Uma descrição detalhada do atendimento
    3. Uma lista de 3-5 tarefas principais que precisam ser realizadas
    4. Recomendações específicas para este tipo de atendimento
    5. Pontos de atenção ou cuidados especiais

    Formate a saída da seguinte forma:

    TÍTULO:
    [título gerado]

    DESCRIÇÃO:
    [descrição detalhada]

    TAREFAS:
    - [tarefa 1]
    - [tarefa 2]
    - [tarefa 3]
    ...

    RECOMENDAÇÕES:
    - [recomendação 1]
    - [recomendação 2]
    ...

    PONTOS DE ATENÇÃO:
    - [ponto 1]
    - [ponto 2]
    ...
    `;

    // Simular a resposta da IA (substitua isso pela chamada real à OpenAI quando estiver pronta)
    const resposta = gerarRespostaSimulada(tipo, sindicato);

    // Salvar no Firestore
    const projetoRef = adminDb.collection("projetos").doc();
    await projetoRef.set({
      id: projetoRef.id,
      tipo,
      sindicato,
      titulo: resposta.titulo,
      descricao: resposta.descricao,
      tarefas: resposta.tarefas,
      recomendacoes: resposta.recomendacoes,
      pontosAtencao: resposta.pontosAtencao,
      dataInicio,
      dataFim,
      participantes: participantes || [],
      status: "Em andamento",
      dataCriacao: new Date(),
    });

    return NextResponse.json({ 
      success: true,
      projeto: {
        id: projetoRef.id,
        ...resposta
      }
    });

  } catch (error) {
    console.error("Erro ao gerar projeto:", error);
    return NextResponse.json(
      { 
        error: "Erro ao gerar projeto", 
        details: error instanceof Error ? error.message : 'Erro desconhecido'
      },
      { status: 500 }
    );
  }
}

// Função temporária para simular a resposta da IA
function gerarRespostaSimulada(tipo: string, sindicato: string) {
  return {
    titulo: `${tipo} - ${sindicato}`,
    descricao: `Atendimento do tipo ${tipo} para o sindicato ${sindicato}. Este projeto visa atender às necessidades específicas do sindicato, garantindo a qualidade e eficiência no serviço prestado.`,
    tarefas: [
      "Realizar levantamento inicial de requisitos",
      "Preparar documentação necessária",
      "Agendar reunião com stakeholders",
      "Executar o atendimento",
      "Coletar feedback e documentar resultados"
    ],
    recomendacoes: [
      "Manter comunicação clara e frequente com o sindicato",
      "Documentar todas as decisões e mudanças",
      "Realizar backups regulares dos dados",
      "Seguir os procedimentos padrão da empresa"
    ],
    pontosAtencao: [
      "Verificar disponibilidade de todos os participantes",
      "Garantir que todos os recursos necessários estejam disponíveis",
      "Monitorar prazos e marcos do projeto",
      "Manter registro de todas as interações"
    ]
  };
}
