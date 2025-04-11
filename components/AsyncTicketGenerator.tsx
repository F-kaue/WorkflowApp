'use client';

import { useState, useEffect } from 'react';
import { Loader2 } from 'lucide-react';

interface AsyncTicketGeneratorProps {
  sindicato: string;
  solicitacaoOriginal: string;
  onTicketGenerated: (ticket: string) => void;
  onError: (error: Error) => void;
}

export default function AsyncTicketGenerator({
  sindicato,
  solicitacaoOriginal,
  onTicketGenerated,
  onError
}: AsyncTicketGeneratorProps) {
  const [isGenerating, setIsGenerating] = useState(true);
  const [progress, setProgress] = useState(0);
  const [currentContent, setCurrentContent] = useState('');

  useEffect(() => {
    // Controle de timeout do cliente
    let timeoutId: NodeJS.Timeout | null = null;
    let abortController: AbortController | null = null;
    let globalTimeoutId: NodeJS.Timeout | null = null;
    
    // Timeout global para garantir que o componente não fique preso em carregamento
    globalTimeoutId = setTimeout(() => {
      console.log("Timeout global atingido, finalizando geração");
      setIsGenerating(false);
      onError(new Error("O tempo máximo para geração do ticket foi excedido. Por favor, tente novamente com uma solicitação mais simples."));
      
      if (abortController) {
        abortController.abort();
      }
    }, 30000); // 30 segundos como tempo máximo total (reduzido para evitar espera excessiva)
    
    const generateTicket = async () => {
      try {
        // Verificar se os campos obrigatórios estão preenchidos
        if (!sindicato || !solicitacaoOriginal) {
          throw new Error("Preencha todos os campos obrigatórios");
        }

        // Criar um AbortController para cancelar a requisição se necessário
        abortController = new AbortController();
        
        // Configurar timeout do cliente (20 segundos - reduzido para detectar problemas mais rapidamente)
        timeoutId = setTimeout(() => {
          if (abortController) {
            console.log("Timeout do cliente atingido, cancelando requisição");
            abortController.abort();
          }
        }, 20000);

        // Iniciar com progresso visível para feedback imediato
        setProgress(10);

        console.log("Iniciando requisição para a API de streaming");
        // Usar a API com suporte a streaming
        const response = await fetch("/api/generate-ticket/stream", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            sindicato,
            solicitacaoOriginal,
          }),
          signal: abortController.signal
        });
        
        console.log(`Resposta recebida com status: ${response.status}`);
        
        // Atualizar progresso após receber a resposta inicial
        setProgress(20);

        // Limpar o timeout após receber a resposta
        if (timeoutId) {
          clearTimeout(timeoutId);
          timeoutId = null;
        }

        if (!response.ok) {
          // Tentar obter detalhes do erro
          let errorMessage = `Erro ${response.status}: Falha ao gerar ticket`;
          try {
            const errorData = await response.json();
            errorMessage = errorData.error || errorMessage;
          } catch {
            // Se não conseguir parsear o JSON, usar a mensagem padrão
          }
          throw new Error(errorMessage);
        }

        // Verificar se a resposta é um stream
        if (!response.body) {
          throw new Error("Resposta inválida do servidor");
        }

        // Processar o stream
        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let ticketContent = '';
        let lastProgressUpdate = Date.now();
        let lastChunkTime = Date.now();
        let receivedAnyData = false;
        let noDataTimeout: NodeJS.Timeout | null = null;

        // Configurar um timeout para detectar se não estamos recebendo dados
        noDataTimeout = setTimeout(() => {
          if (!receivedAnyData) {
            console.log("Nenhum dado recebido após tempo limite, abortando");
            if (abortController) abortController.abort();
            onError(new Error("Não foi possível receber dados do servidor. Por favor, tente novamente."));
            setIsGenerating(false);
          }
        }, 10000); // 10 segundos para receber o primeiro dado
        
        // Verificação periódica para detectar se o stream está parado
        const streamCheckInterval = setInterval(() => {
          const now = Date.now();
          const timeSinceLastChunk = now - lastChunkTime;
          
          console.log(`Verificação de stream: ${timeSinceLastChunk}ms desde o último chunk`);
          
          // Se já recebemos algum dado e o stream está parado por muito tempo
          if (receivedAnyData && timeSinceLastChunk > 10000) { // Reduzido para 10 segundos
            console.log("Stream parece estar parado, finalizando com dados parciais");
            clearInterval(streamCheckInterval);
            
            // Se temos conteúdo suficiente, consideramos como sucesso parcial
            if (ticketContent.length > 100) {
              setProgress(100);
              setIsGenerating(false);
              onTicketGenerated(ticketContent + "\n\n*Nota: Este ticket foi gerado parcialmente devido a uma interrupção na conexão.*");
            } else {
              // Se não temos conteúdo suficiente, tratamos como erro
              setIsGenerating(false);
              onError(new Error("A geração do ticket foi interrompida. Por favor, tente novamente."));
            }
            
            // Abortar a conexão
            if (abortController) {
              abortController.abort();
            }
          }
        }, 3000); // Verificar a cada 3 segundos (reduzido de 5 para 3)
        
        try {
          while (true) {
            // Criar uma promise com timeout para a leitura do chunk
            const readPromise = reader.read();
            const timeoutPromise = new Promise<never>((_, reject) => {
              timeoutId = setTimeout(() => {
                reject(new Error("Timeout ao receber dados do servidor"));
              }, 8000); // Reduzido para 8 segundos
            });
            
            // Aguardar o primeiro a resolver (leitura ou timeout)
            const result = await Promise.race([readPromise, timeoutPromise])
              .finally(() => {
                if (timeoutId) {
                  clearTimeout(timeoutId);
                  timeoutId = null;
                }
              });
            
            // Desestruturar o resultado (se for da leitura)
            const { done, value } = result as ReadableStreamReadResult<Uint8Array>;
            
            if (done) {
              console.log("Stream concluído normalmente");
              break;
            }
            
            // Se chegamos aqui, recebemos dados
            if (!receivedAnyData) {
              receivedAnyData = true;
              // Limpar o timeout de "nenhum dado recebido"
              if (noDataTimeout) {
                clearTimeout(noDataTimeout);
                noDataTimeout = null;
              }
            }
            
            // Atualizar o timestamp do último chunk recebido
            lastChunkTime = Date.now();
            
            // Decodificar o chunk e adicionar ao conteúdo atual
            const chunk = decoder.decode(value, { stream: true });
            console.log(`Chunk recebido: ${chunk.length} caracteres`);
            
            if (chunk.length > 0) {
              ticketContent += chunk;
              setCurrentContent(ticketContent);
              
              // Atualizar o progresso a cada 300ms para feedback mais frequente
              const now = Date.now();
              if (now - lastProgressUpdate > 300) { // Reduzido de 500ms para 300ms
                // Incremento mais gradual para evitar saltos bruscos
                setProgress(prev => {
                  // Incremento menor no início e maior conforme avança
                  const increment = prev < 30 ? 3 : prev < 60 ? 4 : 5; // Incrementos aumentados
                  return Math.min(prev + increment, 95);
                });
                lastProgressUpdate = now;
              }
            }
          }
        } finally {
          // Limpar o intervalo de verificação do stream
          clearInterval(streamCheckInterval);
          if (noDataTimeout) clearTimeout(noDataTimeout);
        }

        // Verificar se recebemos conteúdo válido
        if (ticketContent.trim().length === 0) {
          throw new Error("Não foi possível gerar o ticket. Nenhum conteúdo foi recebido do servidor.");
        }
        
        // Finalizar e notificar o componente pai
        setProgress(100);
        setIsGenerating(false);
        onTicketGenerated(ticketContent);

      } catch (error) {
        console.error("Erro na geração do ticket:", error);
        setIsGenerating(false);
        
        // Mensagem de erro mais amigável para o usuário
        let errorMessage = "Não foi possível gerar o ticket. Por favor, tente novamente.";
        
        if (error instanceof Error) {
          // Verificar se é um erro de timeout ou abort
          if (error.name === 'AbortError' || error.message.includes('abort') || error.message.includes('timeout') || error.message.includes('Timeout')) {
            errorMessage = "O tempo limite foi excedido ao gerar o ticket. Por favor, tente novamente.";
          } else {
            errorMessage = error.message;
          }
        }
        
        onError(new Error(errorMessage));
      } finally {
        // Garantir que todos os recursos sejam liberados
        if (timeoutId) {
          clearTimeout(timeoutId);
        }
        if (globalTimeoutId) {
          clearTimeout(globalTimeoutId);
        }
        abortController = null;
      }
    };

    // Iniciar a geração do ticket com um pequeno atraso para permitir a renderização da UI
    const startDelay = setTimeout(() => {
      generateTicket();
    }, 100);
    
    // Cleanup function
    return () => {
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
      if (globalTimeoutId) {
        clearTimeout(globalTimeoutId);
      }
      if (abortController) {
        abortController.abort();
      }
      clearTimeout(startDelay);
    };
  }, [sindicato, solicitacaoOriginal, onTicketGenerated, onError]);

  return (
    <div className="space-y-4">
      {isGenerating && (
        <div className="flex flex-col items-center justify-center py-8">
          <Loader2 className="h-8 w-8 animate-spin text-primary mb-4" />
          <p className="text-muted-foreground mb-2">Gerando ticket em tempo real...</p>
          <div className="w-full bg-muted rounded-full h-2.5 mb-4">
            <div 
              className="bg-primary h-2.5 rounded-full transition-all duration-300" 
              style={{ width: `${progress}%` }}
            ></div>
          </div>
          {currentContent && (
            <div className="w-full mt-4 p-4 border rounded-md bg-muted/20 max-h-32 overflow-y-auto">
              <p className="text-xs text-muted-foreground font-mono">
                {currentContent.slice(-150)}
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}