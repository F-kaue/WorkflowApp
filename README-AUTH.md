# Configuração de Autenticação

## Configuração do NextAuth

Este projeto utiliza NextAuth.js para autenticação com Google OAuth. Para garantir o funcionamento correto tanto em ambiente de desenvolvimento quanto em produção, siga as instruções abaixo:

### Variáveis de Ambiente Necessárias

Crie um arquivo `.env.local` na raiz do projeto com as seguintes variáveis:

```
# NextAuth
NEXTAUTH_URL=http://localhost:3002  # Em desenvolvimento
# NEXTAUTH_URL=https://workfloowapp.vercel.app  # Em produção
NEXTAUTH_SECRET=seu-segredo-aqui  # Gere um valor aleatório seguro

# Google OAuth
GOOGLE_CLIENT_ID=seu-client-id-do-google
GOOGLE_CLIENT_SECRET=seu-client-secret-do-google
```

### Configuração no Google Cloud Console

1. Acesse o [Google Cloud Console](https://console.cloud.google.com/)
2. Crie ou selecione um projeto
3. Vá para "APIs e Serviços" > "Credenciais"
4. Crie uma credencial OAuth 2.0 para aplicativo Web
5. Adicione as seguintes URLs de redirecionamento autorizadas:
   - `http://localhost:3002/api/auth/callback/google` (para desenvolvimento)
   - `https://workfloowapp.vercel.app/api/auth/callback/google` (para produção)

### Configuração no Vercel

Se estiver implantando no Vercel, adicione as seguintes variáveis de ambiente no projeto:

- `NEXTAUTH_URL`: https://workfloowapp.vercel.app
- `NEXTAUTH_SECRET`: [seu valor secreto gerado]
- `GOOGLE_CLIENT_ID`: [seu ID do cliente Google]
- `GOOGLE_CLIENT_SECRET`: [seu segredo do cliente Google]

## Solução de Problemas

### URLs de Redirecionamento Incorretas

Se você estiver vendo URLs de redirecionamento apontando para o domínio errado nos logs, verifique:

1. Se a variável `NEXTAUTH_URL` está definida corretamente para o ambiente
2. Se as URLs de redirecionamento estão configuradas corretamente no Google Cloud Console
3. Se o arquivo `auth-options.ts` está usando a URL base correta

### Erros de CSRF ou Estado

Se estiver enfrentando erros relacionados a CSRF ou estado, verifique:

1. Se `NEXTAUTH_SECRET` está definido e é o mesmo em todos os ambientes
2. Se os cookies estão configurados corretamente para o ambiente (HTTP vs HTTPS)

### Modo de Depuração

O modo de depuração está ativado apenas em ambiente de desenvolvimento. Para ver logs detalhados, verifique o console do servidor durante o desenvolvimento.