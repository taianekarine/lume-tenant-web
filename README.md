# Lume Tenant Web

Aplicação operacional instalada por cliente. Ela se comunica somente com o
`lume-tenant-api` da mesma instalação e continua funcional sem acesso ao
`lume-control`.

## Responsabilidades

- login e sessão dos colaboradores do tenant;
- dashboard e navegação baseada nas permissões devolvidas pela API;
- administração local de usuários, papéis e permissões;
- consulta da licença local;
- módulos operacionais, como agentes de IA e conversas do WhatsApp.

O frontend não cria usuários por meio do plano de controle e não se comunica
diretamente com n8n ou `lume-edge-agent`.

## Execução

```powershell
Copy-Item .env.example .env.local
npm.cmd install
npm.cmd run dev
```

Por padrão, a API local é `http://localhost:3333/api/v1`. Em produção,
`LUME_TENANT_API_URL` deve usar HTTPS. A autenticação simulada nunca é aceita
quando `NODE_ENV=production`.

Os endpoints consumidos, o fluxo de renovação e os limites atuais do backend
estão documentados em [docs/tenant-api-integration.md](docs/tenant-api-integration.md).
O empacotamento, as sondas e o procedimento de publicação/rollback estão em
[docs/production.md](docs/production.md).

O painel de WhatsApp usa somente a Lume Tenant API, com histórico real,
comandos versionados, resposta humana idempotente e polling server-side com
backoff. Não há integração direta do navegador com n8n, Redis ou Evolution.

## Qualidade

```powershell
npm.cmd run typecheck
npm.cmd run lint
npm.cmd test -- --runInBand
npm.cmd run build
```
