# Solução para o Erro de Redirecionamento OAuth do Google

## Problema Identificado

O erro `redirect_uri_mismatch` ocorre quando a URL de redirecionamento usada na sua aplicação não corresponde exatamente à URL registrada no Console do Google Cloud para o seu projeto.

Mensagem de erro recebida:
```
Não é possível fazer login no app porque ele não obedece à política do OAuth 2.0 do Google.

Se você é o desenvolvedor do app, registre o URI de redirecionamento no Console do Google Cloud.
```

## Solução

### 1. Verificar a URL de Redirecionamento Atual

A URL de redirecionamento que sua aplicação está tentando usar é:
```
http://localhost:3002/api/auth/callback/google
```

### 2. Configurar o Console do Google Cloud

1. Acesse o [Console do Google Cloud](https://console.cloud.google.com/)
2. Selecione seu projeto
3. Vá para "APIs e Serviços" > "Credenciais"
4. Encontre e edite suas credenciais OAuth 2.0
5. Na seção "URIs de redirecionamento autorizados", adicione exatamente:
   ```
   http://localhost:3002/api/auth/callback/google
   ```
6. Se você também usa a aplicação em produção, adicione também:
   ```
   https://workfloowapp.vercel.app/api/auth/callback/google
   ```
7. Salve as alterações

### 3. Modificações Realizadas no Código

As seguintes alterações foram feitas para resolver o problema:

1. Atualização do componente de login para usar a configuração padrão do NextAuth:
   ```javascript
   // Antes
   await signIn("google", { callbackUrl: "/", redirect: true })
   
   // Depois
   await signIn("google", { redirect: true })
   ```

2. Garantia de que a URL base no arquivo `auth-options.ts` corresponda ao ambiente:
   ```javascript
   const baseUrl = process.env.NEXTAUTH_URL || 
     (process.env.NODE_ENV === "production" 
       ? "https://workfloowapp.vercel.app" 
       : "http://localhost:3002")
   ```

### 4. Verificação do Ambiente

Certifique-se de que o arquivo `.env.local` contenha a configuração correta para desenvolvimento:

```
NEXTAUTH_URL=http://localhost:3002
```

### 5. Após as Alterações

Depois de fazer essas alterações:

1. Reinicie o servidor de desenvolvimento
2. Limpe os cookies do navegador relacionados ao domínio
3. Tente fazer login novamente

## Observações Importantes

- O Google OAuth é rigoroso quanto à correspondência exata das URLs de redirecionamento
- Qualquer diferença, mesmo em maiúsculas/minúsculas ou barras finais, causará o erro
- Se você estiver usando portas diferentes em desenvolvimento (não 3002), ajuste as configurações adequadamente
- Pode levar alguns minutos para que as alterações no Console do Google Cloud entrem em vigor

## Referências

- [Documentação do NextAuth.js sobre provedores OAuth](https://next-auth.js.org/providers/google)
- [Documentação do Google sobre erros de redirecionamento OAuth](https://developers.google.com/identity/protocols/oauth2/web-server#authorization-errors-redirect-uri-mismatch)