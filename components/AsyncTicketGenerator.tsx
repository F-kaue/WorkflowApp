'use client';

import React, { useState, useEffect } from 'react';
import { Loader2 } from 'lucide-react';

interface AsyncTicketGeneratorProps {
  sindicato: string;
  solicitacaoOriginal: string;
  onComplete: (content: string) => void;
  onError: (error: string) => void;
}

export function AsyncTicketGenerator({
  sindicato,
  solicitacaoOriginal,
  onComplete,
  onError,
}: AsyncTicketGeneratorProps) {
  const [content, setContent] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);
  const MAX_RETRIES = 2;

  useEffect(() => {
    const abortController = new AbortController();
    let isMounted = true;

    const generateTicket = async () => {
      try {
        if (!sindicato || !solicitacaoOriginal) {
          throw new Error('Sindicato e solicitação são obrigatórios');
        }

        setIsLoading(true);
        setError(null);
        console.log("Iniciando requisição para gerar ticket...");

        const response = await fetch('/api/generate-ticket/stream', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            sindicato,
            solicitacaoOriginal,
          }),
          signal: abortController.signal,
        });

        if (!response.ok) {
          let errorMessage = "Erro ao gerar ticket";
          try {
            const errorData = await response.json();
            errorMessage = errorData.error || `Erro ${response.status}: ${response.statusText}`;
          } catch {
            errorMessage = `Erro ${response.status}: ${response.statusText}`;
          }
          throw new Error(errorMessage);
        }

        if (!response.body) {
          throw new Error('Resposta sem corpo');
        }

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let accumulatedContent = '';

        try {
          while (true) {
            const { done, value } = await reader.read();
            
            if (done) {
              break;
            }

            const chunk = decoder.decode(value, { stream: true });
            accumulatedContent += chunk;

            if (isMounted) {
              setContent(accumulatedContent);
            }
          }

          if (isMounted) {
            if (!accumulatedContent.trim()) {
              throw new Error('Nenhum conteúdo recebido do servidor');
            }
            setContent(accumulatedContent);
            onComplete(accumulatedContent);
            setIsLoading(false);
          }
        } catch (error) {
          throw error;
        } finally {
          reader.releaseLock();
        }

      } catch (err) {
        if (!isMounted) return;

        console.error('Erro ao gerar ticket:', err);
        const isAbortError = err instanceof Error && 
          (err.name === 'AbortError' || err.message.includes('aborted'));

        if (!isAbortError && retryCount < MAX_RETRIES) {
          console.log(`Tentativa ${retryCount + 1} de ${MAX_RETRIES}`);
          setRetryCount(prev => prev + 1);
          // Aumentar o delay entre tentativas
          setTimeout(generateTicket, 2000 * (retryCount + 1));
        } else {
          const errorMessage = err instanceof Error ? err.message : 'Erro desconhecido';
          setError(errorMessage);
          onError(errorMessage);
          setIsLoading(false);
        }
      }
    };

    generateTicket();

    return () => {
      isMounted = false;
      abortController.abort();
    };
  }, [sindicato, solicitacaoOriginal, onComplete, onError, retryCount]);

  if (error) {
    return (
      <div className="p-4 bg-red-50 border border-red-200 rounded-md">
        <p className="text-red-600">Erro ao gerar ticket: {error}</p>
        <p className="text-sm text-red-500 mt-2">
          Por favor, tente novamente. Se o problema persistir, entre em contato com o suporte.
        </p>
      </div>
    );
  }

  return (
    <div className="relative">
      {isLoading && (
        <div className="flex items-center space-x-2 mb-4">
          <Loader2 className="h-4 w-4 animate-spin" />
          <span className="text-sm text-gray-600">
            Gerando ticket{retryCount > 0 ? ` (Tentativa ${retryCount + 1}/${MAX_RETRIES + 1})` : ''}...
          </span>
        </div>
      )}
      {content && (
        <div className="whitespace-pre-wrap font-mono text-sm">
          {content}
        </div>
      )}
    </div>
  );
}