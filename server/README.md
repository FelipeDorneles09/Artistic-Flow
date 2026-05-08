# Stripe Webhook Server

Este servidor recebe eventos da Stripe e atualiza o documento do usuário no Firestore usando o `firebase-admin`.

Como usar localmente:

1. Instale dependências:

```bash
npm install
```

2. Inicie o servidor de webhook:

```bash
npm run start:webhook
```

3. (Opcional em desenvolvimento) exponha o servidor local para a Stripe usando `ngrok`:

```bash
npx ngrok http 4242
# depois configure o endpoint na Stripe: https://{seu-subdominio}.ngrok.io/webhook
```

Observações:
- O servidor espera o arquivo `service-account.json` na raiz do projeto.
- As chaves `STRIPE_SECRET_KEY` e `STRIPE_WEBHOOK_SECRET` estão no arquivo `server/index.js`. Em produção, mova-as para variáveis de ambiente.
