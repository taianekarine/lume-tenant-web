# Integração com a Lume Tenant API

O frontend acessa apenas a URL server-side configurada em
`LUME_TENANT_API_URL`. Tokens da API ficam em cookie `httpOnly` criptografado e
não são expostos a componentes client-side.

## Endpoints integrados

| Recurso       | Endpoints                                                     |
| ------------- | ------------------------------------------------------------- |
| Autenticação  | `POST /auth/login`, `POST /auth/refresh`, `POST /auth/logout` |
| Usuários      | `GET/POST /users`, `GET/PATCH /users/:id`                     |
| Papéis        | `GET/POST /roles`, `PATCH/DELETE /roles/:id`                  |
| Permissões    | `GET /permissions`                                            |
| Licença local | `GET /license/status`                                         |
| WhatsApp      | `GET /whatsapp/conversations`                                 |
| WhatsApp      | `GET /whatsapp/conversations/:id`                             |
| WhatsApp      | `GET /whatsapp/conversations/:id/messages`                    |
| WhatsApp      | `GET /whatsapp/conversations/:id/transitions`                 |
| WhatsApp      | `POST /whatsapp/conversations/:id/actions/take-over`          |
| WhatsApp      | `POST /whatsapp/conversations/:id/actions/return-to-bot`      |
| WhatsApp      | `POST /whatsapp/conversations/:id/actions/forward`            |
| WhatsApp      | `POST /whatsapp/conversations/:id/actions/mark-read`          |
| WhatsApp      | `POST /whatsapp/conversations/:id/messages`                   |

As rotas acima são relativas ao prefixo configurado, normalmente
`http://localhost:3333/api/v1` no desenvolvimento.

## Sessão e renovação

1. O login é enviado por uma Server Action à Tenant API.
2. A sessão necessária para renderização e o par de tokens são armazenados em
   cookies separados, criptografados com `SESSION_SECRET`.
   Sessões maiores que um cookie — por exemplo, usuários com um catálogo amplo
   de permissões — são segmentadas em partes de até 3.500 caracteres e
   recompostas somente no servidor.
3. Antes de uma navegação protegida, o Proxy identifica access tokens próximos
   do vencimento e encaminha a rotação para `GET /auth/refresh-session`.
4. O Route Handler renova o par de tokens, atualiza os cookies e devolve o
   usuário à URL local original. A URL de retorno é validada para impedir
   redirecionamento externo.
5. Server Actions também podem renovar o token e repetir uma mutação uma única
   vez após `401`.
6. Falha de renovação passa por `GET /auth/session-expired`, remove os dois
   cookies locais e exige novo login.
7. O polling do WhatsApp usa uma Route Handler local autenticada. A Route
   Handler envia o JWT à Tenant API e pode renovar o par de tokens; o navegador
   nunca recebe esses tokens.

Carregamentos paralelos de uma mesma página compartilham uma única execução
autenticada. Isso evita duas rotações concorrentes do mesmo refresh token.
Server Components permanecem somente leitura em relação a cookies, conforme o
modelo de execução do Next.js App Router.

## Contratos

Respostas são validadas antes de chegar às páginas. Permissões permanecem
strings opacas: o frontend usa o catálogo retornado por `GET /permissions` e
não mantém uma lista fechada para rejeitar novos códigos válidos.

O estado da licença segue o contrato atual da API:

- `active`: licença dentro da validade;
- `grace`: licença no período de tolerância.

## Contrato do painel WhatsApp

O adapter `LumeApiWhatsAppConversationRepository` é server-only e valida com
Zod as respostas da Tenant API. O `companyId` retornado é mantido no domínio
para auditoria, mas nunca é aceito do navegador nem enviado em filtros: o
backend deriva o tenant exclusivamente do JWT.

As quatro dimensões canônicas consumidas são:

- `department`: `human-resources`, `personnel-department`, `commercial`,
  `purchasing`, `maintenance`, `monitoring`, `operations`, `cleaning`,
  `financial`, `information-technology`;
- `conversationState`: `bot-active`, `waiting-for-customer`,
  `sent-to-human`, `human-active`, `closed`;
- `flowStep`: `main-menu`, `commercial-menu`, `quote-data-collection`,
  `quote-summary-confirmation`, `quote-send-pending`,
  `commercial-follow-up-menu`, `human-service`, `closed`;
- `requestStatus`: `not-started`, `collecting-information`,
  `waiting-for-customer`, `under-review`, `approved`, `rejected`,
  `cancelled`.

O detalhe agrega todas as páginas de mensagens (100 itens por página), incluindo
metadados de anexos HTTPS, `deliveryStatus`, tentativas e motivo de falha. A
solicitação atual é exibida com campos estruturados e sua própria versão.
Campos operacionais internos da API, como identificadores e leases de claim do
dispatcher, hashes ou chaves de persistência das transições, são descartados
pelo adapter e não chegam ao domínio nem aos componentes do painel.

Toda escrita envia:

```json
{
  "commandId": "<uuid novo>",
  "expectedVersion": 7
}
```

`forward` acrescenta `targetDepartment`. Em HTTP 409, a resposta tipada lê
`details.currentVersion`; a Server Action recarrega o detalhe e devolve o estado
atual ao painel. Nenhuma ação sobrescreve silenciosamente uma versão divergente.

O envio humano exige que a conversa esteja em `human-active` e atribuída ao
usuário autenticado. O corpo é:

```json
{
  "commandId": "<uuid estável da tentativa lógica>",
  "idempotencyKey": "<uuid estável para reenvio>",
  "expectedVersion": 7,
  "text": "Mensagem do atendente"
}
```

O painel preserva texto e identificadores em 409 ou falha de comunicação. Em
falha ambígua de comunicação, preserva também o `expectedVersion` original:
isso permite repetir exatamente o mesmo comando caso a API tenha persistido a
mensagem e apenas a resposta tenha se perdido. Somente um 409 explícito,
acompanhado do estado atual recarregado, avança a versão da tentativa lógica.
Assim, uma nova tentativa da mesma mensagem não cria intencionalmente um segundo
comando nem altera o fingerprint idempotente. Em sucesso, a API retorna
`{ "message": ..., "conversation": ... }`;
`message.deliveryStatus` começa em `pending`. O polling posterior apresenta
`sent`, `delivered`, `read` ou `failed`, incluindo a tentativa e seu erro quando
publicados pela API.

Leitura da API exige `whatsapp-conversations:view` ou
`whatsapp-conversations:manage`; este painel de gestão mantém
`whatsapp-conversations:manage` tanto na rota quanto nas Server Actions.

Não há SSE publicado. O MVP atualiza a lista por polling server-side a cada
quatro segundos quando a aba está visível, usa backoff exponencial até trinta
segundos em falhas e reduz consultas com a aba oculta. O detalhe completo só é
recarregado quando a conversa selecionada muda de versão ou `updatedAt`, ou
enquanto há uma mensagem outbound `pending`. A última condição é necessária
porque uma falha de entrega pode atualizar a mensagem sem incrementar a versão
da conversa.

## Configuração

```dotenv
LUME_TENANT_API_URL=http://localhost:3333/api/v1
LUME_TENANT_API_TIMEOUT_MS=5000
SESSION_SECRET=replace-with-at-least-32-random-characters
AUTH_SIMULATION_ENABLED=false
LUME_TENANT_WHATSAPP_DATA_SOURCE=api
```

Em produção, a URL da API deve usar HTTPS e autenticação simulada é sempre
recusada. O datasource de WhatsApp usa `api` por padrão; `mock` exige ativação
explícita fora de produção e é recusado quando `NODE_ENV=production`.

## Pendências reais do contrato WhatsApp

A Tenant API publica os quatro comandos de estado do painel — assumir, devolver
ao bot, encaminhar e marcar como lida — e o envio de texto humano. A matriz atual
não publica comandos de painel para aguardar cliente, fechar conversa ou
cancelar solicitação. Esses controles permanecem desabilitados e identificados
como indisponíveis; o frontend não inventa rotas nem altera dimensões
diretamente.

O detalhe agrega também o log append-only de transições, com ator, versões e as
quatro dimensões antes/depois. Os motivos de falha das tentativas de envio
continuam vinculados às respectivas mensagens.

O frontend nunca contorna essas ausências chamando n8n, Redis, Evolution,
`lume-edge-agent` ou `lume-control` diretamente.
