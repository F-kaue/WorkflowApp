# Configuração de Variáveis de Ambiente no Vercel

Este documento contém todas as variáveis de ambiente necessárias para configurar corretamente o projeto no Vercel. Copie e cole estas variáveis no painel de configuração do Vercel, substituindo os valores pelos seus próprios.

## Variáveis de Ambiente Necessárias

### NextAuth Configuration
```
NEXTAUTH_URL=https://seu-dominio.vercel.app
NEXTAUTH_SECRET=seu-segredo-nextauth (gere um valor aleatório seguro)
```

### Google OAuth
```
GOOGLE_CLIENT_ID=seu-client-id-google
GOOGLE_CLIENT_SECRET=seu-client-secret-google
GOOGLE_REDIRECT_URI=https://seu-dominio.vercel.app/api/auth/callback/google
GOOGLE_REFRESH_TOKEN=seu-refresh-token-google
```

### Firebase Admin SDK
```
FIREBASE_PROJECT_ID=gerenciamento-de-tae
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-fbsvc@gerenciamento-de-tae.iam.gserviceaccount.com
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nSua-Chave-Privada-Aqui\n-----END PRIVATE KEY-----\n"
```

### Firebase Client SDK
```
NEXT_PUBLIC_FIREBASE_API_KEY=AIzaSyAifjVPGOSagJrDBFJ9tmO3bTrQ9pS9IjA
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=gerenciamento-de-tae.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=gerenciamento-de-tae
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=gerenciamento-de-tae.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=742089721891
NEXT_PUBLIC_FIREBASE_APP_ID=1:742089721891:web:d024b2e5ff75c7995e8996
```

### OpenAI
```
OPENAI_API_KEY=sua-chave-api-openai
```

## Instruções

1. Acesse o painel do Vercel e vá para o seu projeto
2. Navegue até a seção "Settings" > "Environment Variables"
3. Adicione cada variável de ambiente com seu respectivo valor
4. Clique em "Save" para salvar as configurações
5. Reimplante seu projeto para que as novas variáveis de ambiente sejam aplicadas

## Observações Importantes

- O valor de `NEXTAUTH_SECRET` deve ser uma string aleatória e segura. Você pode gerar uma usando ferramentas online ou comandos como `openssl rand -base64 32`
- Para obter as credenciais do Google OAuth, você precisa criar um projeto no [Google Cloud Console](https://console.cloud.google.com/) e configurar as credenciais OAuth
- A chave privada do Firebase (`FIREBASE_PRIVATE_KEY`) deve ser formatada corretamente com quebras de linha (`\n`)
- A chave da API OpenAI pode ser obtida no [painel da OpenAI](https://platform.openai.com/api-keys)