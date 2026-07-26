# Produção

O Tenant Web é um frontend server-side do tenant. Ele acessa somente a
`LUME_TENANT_API_URL`; navegador, Route Handlers e Server Actions nunca chamam
n8n, Evolution, Control ou Edge diretamente.

## Artefato

O `Dockerfile` gera o `output: standalone` do Next.js em uma imagem sem
dependências de desenvolvimento e executa o processo como o usuário não-root
`nextjs`.

A compilação usa uma pilha tipográfica local do sistema e não baixa fontes
externas. Isso mantém o artefato reproduzível mesmo quando o ambiente de build
não possui acesso ao Google Fonts.

```powershell
docker build --pull --tag lume-tenant-web:<sha> .
docker run --rm --env-file .env.production -p 3000:3000 lume-tenant-web:<sha>
```

Use uma tag imutável baseada no SHA auditado. Não use `latest` como referência
de rollback.

## Configuração obrigatória

Copie `.env.production.example` para o cofre de configuração da plataforma, não
para a imagem. Requisitos:

- `LUME_TENANT_API_URL` deve ser HTTPS e terminar no prefixo da API, normalmente
  `/api/v1`;
- `SESSION_SECRET` deve ser aleatório, ter pelo menos 32 caracteres e ser
  diferente entre instalações;
- `AUTH_SIMULATION_ENABLED=false`;
- `LUME_TENANT_WHATSAPP_DATA_SOURCE=api`.

Nunca grave tokens, cookies, `SESSION_SECRET` ou o arquivo real de ambiente em
logs, imagens ou repositórios.

## Rede e TLS

Publique a porta 3000 somente na rede interna do proxy reverso. O proxy deve:

- terminar TLS;
- preservar `Host` e `X-Forwarded-Proto`;
- recusar HTTP externo ou redirecioná-lo para HTTPS;
- limitar o tamanho de corpo;
- aplicar timeout superior ao timeout server-side da Tenant API.

O Tenant Web precisa alcançar apenas a Tenant API e os destinos HTTPS dos anexos
publicados por ela.

## Sondas

- `GET /api/health`: liveness do processo Next.js;
- `GET /api/readiness`: valida a configuração e a sonda
  `GET <LUME_TENANT_API_URL>/health/ready`.

Use `health` para reinício do contêiner e `readiness` para entrada/remoção no
balanceador. Nenhuma sonda expõe segredos ou JWTs.

## Publicação

1. Execute `npm ci`, typecheck, lint, testes e build.
2. Gere e identifique a imagem pelo SHA.
3. Confirme que as migrations e o bootstrap da Tenant API já terminaram.
4. Suba uma réplica sem tráfego e valide `health` e `readiness`.
5. Execute login real, abertura de conversa, takeover e envio humano controlado.
6. Direcione tráfego e acompanhe erros 401, 409, 5xx e falhas de readiness.

O envio humano registra primeiro uma mensagem `pending` na Tenant API. A
confirmação `sent`, `delivered`, `read` ou `failed` aparece depois pelo polling;
uma resposta HTTP bem-sucedida do painel não deve ser interpretada como entrega
ao WhatsApp.

## Rollback

Mantenha a imagem anterior e o conjunto de variáveis compatível. Para rollback,
retire a imagem nova do balanceador, restaure a imagem anterior e valide as duas
sondas. O frontend não executa migrations e seu rollback não deve reverter o
banco da Tenant API.
