# Arquitetura do Lume Tenant Web

```text
Navegador
  -> Next.js / Server Actions
  -> LUME_TENANT_API_URL
  -> PostgreSQL local do cliente
```

O plano de controle não participa de login, autorização ou operação diária.
Sessão, cookies e segredos deste frontend são exclusivos da instalação.

As permissões são strings opacas no formato `recurso:ação`. O backend é a
autoridade do catálogo e pode introduzir novas permissões sem exigir uma
publicação imediata do frontend.

O branding vem das variáveis `NEXT_PUBLIC_TENANT_*`. Departamentos e módulos
específicos, como o fluxo comercial de transporte da Milenium, devem permanecer
configuráveis por tenant.

Conversas do WhatsApp passam pelo
`LumeApiWhatsAppConversationRepository`, que é server-only. Server Components,
Server Actions e a Route Handler de polling são os únicos consumidores desse
adapter. O datasource padrão é a Tenant API; mock exige flag explícita fora de
produção e é recusado em `production`.

O painel envia `expectedVersion` em toda escrita e nunca calcula estados de
destino. A matriz e o isolamento por `companyId` permanecem sob autoridade da
Tenant API. Em conflito 409, o frontend recarrega a conversa antes de permitir
uma nova tentativa. O frontend nunca chama n8n, Redis, Evolution ou o edge
diretamente.

Mensagens humanas usam `commandId` e `idempotencyKey` estáveis enquanto o
rascunho não for confirmado. A Tenant API persiste a mensagem em `pending` e
publica o processamento assíncrono; o frontend apenas acompanha o resultado pelo
histórico versionado.

Consulte [tenant-api-integration.md](tenant-api-integration.md) para os
endpoints já integrados, o ciclo de renovação da sessão e as pendências de
contrato da API.
