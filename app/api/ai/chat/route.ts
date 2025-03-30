import { NextResponse } from 'next/server';
import OpenAI from 'openai';
import { adminDb, assertIsServer } from '@/lib/firebase-admin-server';
import { Timestamp } from 'firebase-admin/firestore';

// Interface para documentos da coleção ai_training
interface AITrainingDocument {
  content: string;
  timestamp: Timestamp;
  [key: string]: any; // Para outros campos que possam existir
}

// Garantir que este código só execute no servidor
assertIsServer();

// Cache para respostas similares
const responseCache = new Map();

// Função para gerar uma chave de cache baseada na mensagem
function generateCacheKey(message: string): string {
  // Normalizar a mensagem para melhorar as chances de cache hit
  return message.trim().toLowerCase();
}

type ChatRequestBody = {
  message: string;
};

// Função para verificar se duas strings são similares (para cache aproximado)
function stringSimilarity(s1: string, s2: string): number {
  const longer = s1.length > s2.length ? s1 : s2;
  const shorter = s1.length > s2.length ? s2 : s1;
  if (longer.length === 0) return 1.0;
  return (longer.length - editDistance(longer, shorter)) / longer.length;
}

function editDistance(s1: string, s2: string): number {
  s1 = s1.toLowerCase();
  s2 = s2.toLowerCase();
  const costs = [];
  for (let i = 0; i <= s1.length; i++) {
    let lastValue = i;
    for (let j = 0; j <= s2.length; j++) {
      if (i === 0) costs[j] = j;
      else if (j > 0) {
        let newValue = costs[j - 1];
        if (s1.charAt(i - 1) !== s2.charAt(j - 1))
          newValue = Math.min(Math.min(newValue, lastValue), costs[j]) + 1;
        costs[j - 1] = lastValue;
        lastValue = newValue;
      }
    }
    if (i > 0) costs[s2.length] = lastValue;
  }
  return costs[s2.length];
}

export async function POST(request: Request) {
  try {
    // Implementar cache-control para navegadores
    const headers = new Headers();
    headers.append('Cache-Control', 'private, max-age=3600');

    const body: ChatRequestBody = await request.json();
    const { message } = body;

    if (!message) {
      return NextResponse.json(
        { error: 'Mensagem não fornecida' },
        { status: 400, headers }
      );
    }

    // Verificar cache para mensagens idênticas ou muito similares
    const cacheKey = generateCacheKey(message);
    if (responseCache.has(cacheKey)) {
      console.log('Cache hit para mensagem idêntica');
      return NextResponse.json(responseCache.get(cacheKey), { headers });
    }

    // Verificar cache para mensagens similares (threshold de 0.85 de similaridade)
    for (const [key, value] of responseCache.entries()) {
      if (stringSimilarity(cacheKey, key) > 0.85) {
        console.log('Cache hit para mensagem similar');
        return NextResponse.json(value, { headers });
      }
    }

    // Verificar se a chave da API está definida
    if (!process.env.OPENAI_API_KEY) {
      console.error('OPENAI_API_KEY não está definida nas variáveis de ambiente');
      return NextResponse.json(
        { error: 'Configuração da API não está completa' },
        { status: 500 }
      );
    }

    // Verificar se a chave da API começa com o prefixo correto
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey.startsWith('sk-')) {
      console.error('OPENAI_API_KEY parece estar em formato inválido');
      return NextResponse.json(
        { error: 'Configuração da API OpenAI parece estar incorreta' },
        { status: 500 }
      );
    }

    console.log('Iniciando chamada para OpenAI API');

    const openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });

    // Buscar dados de treinamento do Firestore
    console.log('Buscando dados de treinamento do Firestore');
    const trainingSnapshot = await adminDb.collection('ai_training')
      .orderBy('timestamp', 'desc')
      .limit(20)
      .get();

    // Extrair conteúdo de treinamento
    const trainingData = trainingSnapshot.docs.map((doc: FirebaseFirestore.QueryDocumentSnapshot<AITrainingDocument>) => {
      const data = doc.data() as AITrainingDocument;
      return data.content;
    }).join('\n\n');
    console.log(`Encontrados ${trainingSnapshot.size} documentos de treinamento`);

    // Construir o prompt do sistema com os dados de treinamento
    const systemPrompt = `Você é um assistente especializado no sistema SindSystem, focado em ajudar usuários com dúvidas sobre o sistema. Suas respostas devem ser claras, objetivas e detalhadas, fornecendo passos específicos quando necessário. Use tópicos numerados para instruções com múltiplos passos. Evite usar asteriscos para ênfase. Seja conciso e direto, priorizando informações relevantes. Você deve ser cordial e profissional.

Aqui estão informações específicas sobre o sistema que você deve usar para responder às perguntas:\n${trainingData}`;

    console.log('Prompt do sistema construído com dados de treinamento');

    const response = await openai.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: [
        {
          role: 'system',
          content: systemPrompt
        },
        { role: 'user', content: message }
      ],
      temperature: 0.7,
      max_tokens: 800,
      presence_penalty: 0.1,  // Reduz repetições
      frequency_penalty: 0.1, // Encoraja diversidade no texto
    });

    console.log('Resposta gerada com base nos dados de treinamento');

    console.log('Resposta recebida da OpenAI API');

    const aiResponse = response.choices[0].message.content;

    // Formatar a resposta para melhor organização
    try {
      const formatResponse = await fetch(new URL('/api/ai/format-response', request.url), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ response: aiResponse }),
      });

      // Verificar se a resposta é válida
      if (!formatResponse.ok) {
        console.log('Formatação falhou, retornando resposta original');
        // Se a formatação falhar, retornar a resposta original
        return NextResponse.json({ response: aiResponse });
      }

      // Verificar o tipo de conteúdo da resposta
      const contentType = formatResponse.headers.get('content-type') || '';
      if (!contentType.includes('application/json')) {
        console.error('Resposta de formatação não é JSON. Tipo de conteúdo:', contentType);
        return NextResponse.json({ response: aiResponse });
      }

      // Tentar fazer o parsing do JSON com tratamento de erro
      const formattedData = await formatResponse.json();
      
      // Armazenar no cache
      responseCache.set(cacheKey, { response: formattedData.response });

      // Limitar o tamanho do cache para evitar uso excessivo de memória
      if (responseCache.size > 100) {
        const oldestKey = responseCache.keys().next().value;
        responseCache.delete(oldestKey);
      }

      return NextResponse.json({
        response: formattedData.response
      }, { headers });
    } catch (formatError) {
      console.error('Erro ao formatar resposta:', formatError);
      // Se ocorrer qualquer erro na formatação, retornar a resposta original
      
      // Armazenar no cache mesmo em caso de erro
      responseCache.set(cacheKey, { response: aiResponse });
      
      // Limitar o tamanho do cache para evitar uso excessivo de memória
      if (responseCache.size > 100) {
        const oldestKey = responseCache.keys().next().value;
        responseCache.delete(oldestKey);
      }
      
      return NextResponse.json({ response: aiResponse }, { headers });
    }
  } catch (error: any) {
    console.error('Erro ao processar mensagem:', error);

    // Tratamento de erros mais específico
    let errorMessage = 'Erro ao processar a solicitação';
    let statusCode = 500;

    if (error instanceof OpenAI.APIError) {
      console.error('OpenAI API Error:', error.status, error.message);
      errorMessage = `Erro na API OpenAI: ${error.message}`;

      // Tratamento específico para erros comuns da API OpenAI
      if (error.status === 401) {
        errorMessage = 'Erro de autenticação com a API OpenAI. Verifique a chave da API.';
      } else if (error.status === 429) {
        errorMessage = 'Limite de requisições excedido na API OpenAI. Tente novamente mais tarde.';
      } else if (error.status === 500) {
        errorMessage = 'Erro interno no servidor da OpenAI. Tente novamente mais tarde.';
      }
    } else if (error instanceof Error) {
      errorMessage = `Erro: ${error.message}`;
    }

    return NextResponse.json(
      { error: errorMessage },
      { status: statusCode }
    );
  }
}
