import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// Função para determinar o responsável com base no conteúdo da solicitação
export function determinarResponsavel(conteudo: string): string {
  const conteudoLowerCase = conteudo.toLowerCase();
  
  // Palavras-chave para atribuição ao Walter (banco de dados, exclusão em massa)
  const palavrasChaveWalter = [
    'banco de dados', 'database', 'sql', 'exclusão em massa', 'excluir dados',
    'migração de dados', 'backup', 'restore', 'postgresql', 'mysql', 'mongodb',
    'firebase', 'firestore', 'dados', 'relatório', 'consulta', 'query',
    'importação', 'exportação', 'planilha', 'excel', 'csv', 'json'
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
