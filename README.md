# Lume Tenant Web

Aplicação operacional instalada por cliente. Ela se comunica somente com o
`lume-tenant-api` da mesma instalação e continua funcional sem acesso ao
`lume-control`.

> **Estado atual:** MVP em validação local. Nenhuma das mudanças descritas
> neste documento foi publicada em produção.

## Para que serve

Este é o painel usado pelos colaboradores da empresa. Em linguagem prática, ele
permite entrar com segurança, visualizar apenas as áreas autorizadas, acompanhar
notificações, atender clientes pelo WhatsApp, preparar e enviar orçamentos,
administrar usuários e abrir solicitações de suporte.

O painel não envia mensagens nem altera o banco sozinho. Todas as operações
passam pela Tenant API, que valida o usuário, a empresa, as permissões e o estado
mais recente antes de aceitar uma ação.

## Responsabilidades

- login, recuperação de senha e sessão dos colaboradores do tenant;
- dashboard e navegação baseada na interseção entre departamentos e permissões devolvidas pela API;
- administração local de usuários, departamentos, permissões individuais e estados de acesso;
- consulta da licença local;
- módulos operacionais, como agentes de IA e o Painel WhatsApp.

O frontend não cria usuários por meio do plano de controle e não se comunica
diretamente com n8n ou `lume-edge-agent`.

O departamento define o escopo estrutural de páginas e filas; a permissão
individual limita as operações disponíveis dentro desse escopo. O cadastro de
usuários seleciona um ou mais dos nove departamentos do MVP — Comercial,
Compras, Controladoria, Departamento Pessoal, Financeiro, Gerência, Manutenção,
Monitoramento e Operacional — e, em seguida, somente permissões compatíveis com
esses vínculos. Códigos técnicos de departamento, estado ou permissão não são
exibidos aos atendentes.

Contas administradoras não podem ser criadas, promovidas, rebaixadas ou
transferidas pelo Tenant Web. O cadastro sempre cria um usuário padrão com
departamentos e permissões explícitas; uma conta administradora já
provisionada aparece apenas como informação de leitura.

As rotas `/users` e `/license` exigem vínculo com o departamento Gerência e,
respectivamente, `users:view`/`users:manage` ou `license:view`. A sidebar separa
módulos em **Geral**, **Comercial** e **Administração**; Painel WhatsApp e
Orçamentos são exclusivos do escopo Comercial. **Orçamentos** é uma pasta de
navegação com as filas **Pendentes**, **Enviadas**, **Aprovadas** e
**Canceladas**; Pendentes aparece primeiro e é a única subpasta com a contagem
autoritativa da Tenant API. A pasta exibe apenas um ícone quando há notificação.
Os gráficos e motivos de cancelamento ficam no Dashboard Comercial.

O botão **Esqueci minha senha** abre o fluxo público e não revela se o
identificador informado existe. A senha inicial criada durante o
provisionamento não autentica nem cria sessão: após a credencial inicial ser
validada, um Dialog solicita a senha definitiva e retorna automaticamente ao
login. O e-mail via Resend fica reservado à recuperação solicitada por
**Esqueci minha senha** ou pelo administrador.

Falhas de login, recuperação e redefinição exibem uma mensagem legível e
`Código do erro: <CODE>`. O código estável deve ser informado ao suporte; códigos
retornados pela Tenant API são preservados e falhas locais possuem fallbacks
determinísticos para validação, timeout, indisponibilidade e limite de tentativas.
Usuários e perfil seguem o mesmo contrato, inclusive para `HTTP_413`.

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

O Painel WhatsApp usa somente a Lume Tenant API, com histórico real, comandos
versionados, resposta do atendente idempotente e polling server-side com
backoff. O botão **Histórico completo / Mensagens e anexos** abre o painel
lateral de atendimento, construído com o componente `Message` do shadcn/ui,
para leitura do histórico, anexos e envio de texto pelo atendente. No desktop,
esse painel pode usar até 84 rem de largura — aproximadamente o dobro da largura
anterior — e, no celular, ocupa a largura disponível sem criar rolagem
horizontal. O header
autenticado também concentra o sino para todos os usuários ativos; a Tenant API
retorna somente notificações compatíveis com seus departamentos. Não há
integração direta do navegador com n8n, Redis ou Evolution.

No MVP, uma proposta aprovada não impede o atendente de encerrar a conversa,
desde que não exista outra proposta em coleta, aguardando cliente ou em análise.
A política mais restritiva foi preservada no domínio, mas está explicitamente
desabilitada para possível reativação futura. A Tenant API permanece
autoritativa: se ela recusar o comando, o painel mostra o erro e não simula o
encerramento.

O atendente responsável pode alterar o status comercial do orçamento atual no
Painel WhatsApp. A ação recarrega a conversa autoritativa, exige motivo para
recusa ou cancelamento e respeita a versão devolvida pela Tenant API. Na fila
**Orçamentos > Pendentes**, o bloco **Novo orçamento avulso** lista somente
atendimentos comerciais abertos já assumidos pelo usuário atual; o formulário
vincula o novo resumo e seus PDFs à conversa escolhida.

## Configuração passo a passo

1. Copie `.env.example` para `.env.local`.
2. Informe a URL da Tenant API desta instalação.
3. Gere um `SESSION_SECRET` exclusivo com pelo menos 32 bytes.
4. Mantenha simulação e mocks desabilitados, exceto em teste local intencional.
5. Ajuste nome, produto, logotipo e cor caso o tenant use outra identidade.
6. Instale as dependências e execute `npm.cmd run dev`.

Os exemplos de ambiente são organizados por finalidade e informam o que é
obrigatório, opcional, público ou secreto. Valores `NEXT_PUBLIC_*` chegam ao
navegador e nunca podem conter chaves, tokens, senhas ou licenças.

## O que reutilizar em novas telas

- `AuthenticatedShell` e o catálogo de navegação para manter sidebar, header,
  permissões e tema consistentes;
- `CurrentUserAvatar` para fotos do usuário atual;
- `ConversationMessageSheet` para histórico, anexos, takeover e envio pelo
  atendente;
- os repositórios `LumeApi*` e as Server Actions existentes para que o browser
  nunca receba credenciais da API;
- os componentes base de `src/shared/ui`, sem copiá-los nem alterá-los;
- o tratamento compartilhado de erros públicos para sempre informar um código
  útil ao suporte.

Uma futura interface de importação e exportação deve receber da Tenant API um
contrato de lote, progresso, erros por registro e download. Conversão de
documentos e planilhas não deve ocorrer no navegador. Enquanto esse contrato
não estiver publicado, não deve ser criada uma tela que invente estados ou
formatos.

## Qualidade

```powershell
npm.cmd run format:check
npm.cmd run typecheck
npm.cmd run lint
npm.cmd test -- --runInBand
npm.cmd run build
git diff --check
```
