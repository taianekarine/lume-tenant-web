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

O departamento é o limite estrutural de navegação e dados; permissões
individuais, no formato `recurso:ação`, refinam o que o usuário pode fazer
dentro desse limite. O formulário de criação segue três etapas: dados básicos,
seleção de um ou mais departamentos e seleção das permissões compatíveis
publicadas por `GET /permissions`. Permissões implícitas permanecem sob
autoridade da Tenant API e não podem ser removidas pelo navegador.

O catálogo público possui exatamente Comercial, Compras, Controladoria,
Departamento Pessoal, Financeiro, Gerência, Manutenção, Monitoramento e
Operacional. Registros legados continuam legíveis para compatibilidade, sempre
traduzidos para um rótulo humano, mas não voltam às opções de cadastro nem aos
filtros e encaminhamentos do Painel WhatsApp.

`/users` exige departamento Gerência e ao menos uma permissão entre
`users:view`, `users:create`, `users:update` e `users:manage`;
`/license` exige o mesmo departamento e `license:view`. Painel WhatsApp e
Orçamentos exigem departamento Comercial e a permissão do módulo.

As conversas exibidas no Painel WhatsApp passam pelo
`LumeApiWhatsAppConversationRepository`, que é server-only. Server Components,
Server Actions e a Route Handler de polling são os únicos consumidores desse
adapter. O datasource padrão é a Tenant API; mock exige flag explícita fora de
produção e é recusado em `production`.

O painel envia `expectedVersion` em toda escrita e nunca calcula estados de
destino. A matriz e o isolamento por `companyId` permanecem sob autoridade da
Tenant API. Em conflito 409, o frontend recarrega a conversa antes de permitir
uma nova tentativa. O frontend nunca chama n8n, Redis, Evolution ou o edge
diretamente.

## Shell, tema e estados de carregamento

As rotas autenticadas compartilham `AuthenticatedShell`, montado com os
componentes oficiais do bloco `sidebar-07` do shadcn/ui (`SidebarProvider`,
`Sidebar`, `SidebarInset`, dropdowns e rail). A sidebar usa o catálogo central
de navegação e continua filtrada pelas permissões devolvidas pelo backend. Ela
pode ser recolhida no desktop e funciona como drawer no mobile. O header ocupa
uma única linha, sem margem superior no inset, com breadcrumb da rota e
alternância entre os modos claro e escuro. O acionador da sidebar e o
breadcrumb são adjacentes, sem um separador vertical ornamental. Cabeçalhos de
página usam espaçamento compacto para preservar a área útil antes das filas,
gráficos e catálogos.

A foto do usuário é sincronizada no shell pelo
`CurrentUserProfilePictureProvider`. Depois que a Tenant API confirma uma
alteração em **Meu perfil**, a página publica o novo `dataUrl` para todas as
representações montadas do usuário. A sidebar já consome
`CurrentUserAvatar`; o mesmo componente é reutilizável em mensagens e outros
contextos sem alterar os componentes base do shadcn/ui. A cópia local é
separada por `userId` e serve somente para atualização visual imediata: a
Tenant API continua sendo a fonte de verdade do perfil.

Os itens são organizados em três grupos:

- **Geral:** Dashboard, Agentes de IA e Suporte, sujeitos às respectivas
  permissões e com conteúdo filtrado pelo departamento;
- **Comercial:** Painel WhatsApp e Orçamentos, somente para vínculo Comercial;
- **Administração:** Usuários e Licença, somente para vínculo Gerência e a
  permissão individual correspondente.

O tema usa `next-themes` e os tokens semânticos de `globals.css`; componentes
de domínio não persistem preferência paralela. `src/app/loading.tsx` fornece o
skeleton global de navegação e conteúdo durante transições do App Router.

O dashboard consulta conversas somente pelo repositório server-only da Tenant
API. Os cartões e os gráficos shadcn/Recharts (barras operacionais e setores por
departamento) são calculados a partir dos dados reais retornados:

- **Bot ativo:** `conversationState = bot-active`;
- **Atendente ativo:** `conversationState = human-active`;
- **Automação pausada:** `waiting-for-customer` ou `sent-to-human`;
- **Conversas não lidas:** quantidade de conversas com `unreadCount > 0`.

Na caixa de entrada, os mesmos indicadores são renderizados dentro do componente
que executa o polling. Assim, cartões, lista e detalhe usam o mesmo snapshot e
não divergem após uma transição.

O histórico e o compositor não ocupam permanentemente o detalhe da conversa.
O botão **Abrir chat** abre um `Sheet` com o
componente oficial `Message` do shadcn/ui. Cada item apresenta direção, data,
remetente, estado de entrega e anexos autorizados. O envio pelo atendente parte
desse painel lateral e continua usando apenas uma Server Action e a Tenant API.
O `Sheet` mantém largura total no mobile e chega a 84 rem no desktop,
aproximadamente o dobro do limite anterior de 42 rem. O container e as ações
usam limites flexíveis e `overflow-x-hidden`, portanto textos, contador e botões
não introduzem rolagem horizontal.

O detalhe mantém telefone sob o nome, responsável e canal no cabeçalho e as
dimensões canônicas em uma grade compacta. Assumir, devolver e encerrar ficam
na coluna operacional; Abrir chat, Encaminhar e Alterar status ficam na coluna
de apoio. Encaminhamento, status, lista de orçamentos e histórico de ações são
modais, evitando que formulários e históricos imponham rolagem permanente à
página. O botão Assumir fica desabilitado assim que houver responsável; a
devolução ao bot usa exclusivamente o comando versionado da Tenant API.

Mensagens enviadas pelo atendente usam `commandId` e `idempotencyKey` estáveis
enquanto o rascunho não for confirmado. A Tenant API persiste a mensagem em
`pending` e publica o processamento assíncrono; o frontend apenas acompanha o
resultado pelo histórico versionado.

O encerramento também é um comando versionado da Tenant API. Durante o MVP,
uma proposta já aprovada não bloqueia o encerramento manual. A antiga política
permanece documentada na constante
`BLOCK_APPROVED_QUOTE_CONVERSATION_CLOSE=false`, permitindo reativação futura
sem apagar a decisão anterior. Propostas ainda em coleta, aguardando o cliente
ou em análise continuam bloqueando a ação. A Tenant API é a autoridade final:
uma resposta de erro não é convertida em sucesso pelo frontend. Uma conversa
com proposta aprovada, sem atendente e em `waiting-for-customer` também pode ser
devolvida ao bot para o menu de acompanhamento. Quando a solicitação foi
recusada, o motivo efetivo é obrigatório. O painel apresenta o histórico de
encerramento com data e hora, atendente responsável e motivo, sem expor o log
técnico completo de transições.

## Fronteira para importação e exportação

O navegador não interpreta, converte ou armazena arquivos de negócio. A futura
interface de importação/exportação deve consumir um gateway server-only
publicado pela Tenant API e validar a resposta com Zod. O contrato deve expor,
no mínimo, identificação do lote, estado de processamento, contagens, erros por
registro, metadados seguros do arquivo e um download autenticado.

Tipos e gateways só devem ser adicionados depois que a Tenant API publicar o
contrato definitivo. Esse limite evita duplicar conversores, regras de
segurança, catálogos de MIME e estados de lote entre backend e frontend.

Propostas comerciais usam uma fronteira separada,
`LumeApiQuoteProposalRepository`, sem criar um segundo dono de estado. O
Dashboard Comercial mostra os gráficos calculados pelo `summary` autoritativo
da Tenant API. A rota `/quote-proposals` apenas redireciona para a fila
prioritária e a pasta Comercial separa as subrotas
`stage=pending`, `stage=sent`, `stage=approved` e `stage=cancelled`; um documento
só entra em Enviadas quando a confirmação positiva do provedor já estiver
persistida. Canceladas inclui decisões recusadas e cancelamentos, sempre com o
motivo publicado no histórico e no resumo agregado. Os filtros automáticos
operam sobre todas as páginas carregadas pelo adapter server-only, e não sobre
uma amostra da primeira página. Um lote contém no máximo cinco PDFs de 10 MiB e é enviado
em duas fases: todos os uploads usam a versão inicial e terminam antes do
primeiro envio; depois, os envios avançam a versão da conversa em sequência. O
painel gera um `batchId` técnico e a Server Action envia, em todos os comandos,
a mesma lista ordenada `batchDocumentIds` obtida após os uploads. A Tenant API
valida e congela exatamente esses documentos; uploads órfãos ou concorrentes
não entram no lote. O navegador não decide se o lote terminou. Upload e
confirmação passam por Server Actions: o navegador nunca chama n8n ou Evolution
e nunca decide o próximo estado da conversa. Um PDF persistido pode ser
reutilizado após falha do envio; `batchId`, `batchDocumentIds` e `commandId`
permanecem estáveis durante a mesma tentativa lógica. A atribuição automática ao atendente que enviou a
primeira proposta é uma regra da Tenant API. O histórico é separado por
conversa e solicitação, não por telefone, e o detalhe autoritativo fornece a
lista completa de PDFs. A sidebar consulta a contagem autoritativa, exibe um
único ícone na pasta Orçamentos quando há notificação e reserva o badge numérico
para Pendentes. A tela atualiza a fila a cada cinco segundos, ao
retomar o foco e por ação manual, removendo o item somente depois que a Tenant
API publicar a confirmação assíncrona de todos os membros do lote. O painel de
conversa traduz essa confirmação para `Proposta enviada` e `Aguardando cliente`,
sem continuar exibindo `Aguardando proposta`.

Todo funcionário recebe as permissões implícitas de autoatendimento publicadas
pela Tenant API. O dashboard limita os dados às filas atribuídas ao usuário. O
sino de notificações fica no header para todo usuário ativo, sem depender de
departamento ou permissão de módulo. `GET /notifications` deriva os
departamentos do JWT e retorna somente itens compatíveis; no Comercial isso
inclui novos orçamentos pendentes. A inspeção complementar de automações
pausadas só ocorre quando o usuário também possui
`whatsapp-conversations:manage`. O badge representa apenas itens ainda não
visualizados pelo usuário. `GET /notifications` publica `unreadCount`,
`read` e `unreadTotal`; abrir o Drawer zera o badge de forma otimista e chama
`POST /notifications/:notificationId/read`. A leitura fica persistida por
usuário na Tenant API, sem remover a pendência da lista. O armazenamento local
é usado para notificações da API somente quando essa confirmação falha. Novos
ciclos pendentes voltam a ser não lidos. Automações pausadas, ainda derivadas
da projeção do painel, mantêm leitura local por identificador.

## Autenticação e ciclo da conta

O login só aceita uma resposta de sessão completa. A senha inicial de
provisionamento não abre sessão; a Tenant API responde
`ACCOUNT_PASSWORD_SETUP_REQUIRED` depois de validar a credencial e o frontend
orienta contato com o administrador. O formato legado
`passwordChangeRequired` é tratado como resposta incompatível e nunca é
convertido em sessão ou formulário inline.

**Esqueci minha senha** direciona para `/forgot-password`. A Server Action
valida e normaliza o identificador, chama `POST /auth/password/forgot` e
apresenta a mesma confirmação independentemente de a conta existir. O token
entregue por e-mail abre `/reset-password?token=...`; somente essa rota renderiza
o formulário que consome `POST /auth/password/change`.

Contas usam os estados `active`, `inactive` e `suspended`. A suspensão exige
motivo e prazo em quantidade de dias ou data final. A Tenant API bloqueia novas
autenticações e sessões existentes. `users:update` edita dados, departamentos,
permissões e recuperação de senha; `users:manage` atua somente no estado da
conta, permitindo reativar, desativar ou suspender. `users:delete` não existe no
catálogo nem na interface.

Consulte [tenant-api-integration.md](tenant-api-integration.md) para os
endpoints já integrados, o ciclo de renovação da sessão e as pendências de
contrato da API.
