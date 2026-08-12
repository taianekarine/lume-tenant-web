# Ambientes e branches do Tenant Web

## Estado verificado em 11/08/2026

O repositório documenta a construção da imagem Docker, mas não contém workflow
de deploy automático nem arquivo Compose versionado. Portanto, o deploy atual é
manual ou depende de configuração externa na VPS que deve ser auditada no
servidor. A branch remota `staging` foi criada a partir da `main`.

## Regra obrigatória

- staging recebe somente a branch `staging`;
- produção recebe somente a branch `main`;
- cada ambiente usa clone, imagem, porta, domínio, `SESSION_SECRET` e arquivo de
  variáveis próprios;
- a URL da Tenant API de staging nunca pode apontar para a API de produção;
- produção só é atualizada após aprovação explícita do staging.

## Staging

```bash
cd /home/taiane/lume-staging/lume-tenant-web
git fetch origin
git switch staging
git pull --ff-only origin staging
test "$(git branch --show-current)" = "staging"
git_sha=$(git rev-parse --short=12 HEAD)
docker build --pull --tag "lume-tenant-web-staging:${git_sha}" .
docker run -d --restart unless-stopped \
  --name lume-tenant-web-staging \
  --env-file .env.staging \
  -p 127.0.0.1:3100:3000 \
  "lume-tenant-web-staging:${git_sha}"
```

Substitua o contêiner existente de forma controlada conforme o proxy da VPS e
valide `/api/health`, `/api/readiness`, login e recuperação de senha.

## Produção

Somente após aprovação e merge autorizado de `staging` em `main`:

```bash
cd /home/taiane/lume/lume-tenant-web
git fetch origin
git switch main
git pull --ff-only origin main
test "$(git branch --show-current)" = "main"
git_sha=$(git rev-parse --short=12 HEAD)
docker build --pull --tag "lume-tenant-web:${git_sha}" .
docker run -d --restart unless-stopped \
  --name lume-tenant-web \
  --env-file .env.production \
  -p 127.0.0.1:3000:3000 \
  "lume-tenant-web:${git_sha}"
```

Os comandos de substituição e rollback do contêiner devem seguir a configuração
real do proxy e do orquestrador da VPS; não remova o contêiner anterior antes de
confirmar que a nova imagem está saudável.
