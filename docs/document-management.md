# Gestão documental no Tenant Web

O frontend oferece duas áreas:

- `/documents`: solicitações próprias, checklist, progresso, prazo e reenvio;
- `/document-management`: acompanhamento e revisão por RH, DP ou Gerência.

Server Components, Server Actions e `/documents/files/:fileId` usam gateway
server-only. O proxy repassa somente cabeçalhos seguros e força
`Cache-Control: private, no-store`.

A conclusão que chama o agente documental usa o timeout dedicado
`LUME_TENANT_API_DOCUMENT_REVIEW_TIMEOUT_MS` (300 segundos por padrão), pois a
extração pode executar até três tentativas na API. As demais chamadas mantêm o
timeout curto do gateway.

Usuários com `documentAccessMode=document-portal` são direcionados a
`/documents` após o login e veem somente a navegação documental. A API também
limita suas permissões; a proteção não depende do menu.

O menu **Pessoas** exibe **Usuários** e **Gestão documental** conforme as
permissões. Administradores mantêm edição integral de departamentos,
permissões e estado das contas. RH e Departamento Pessoal veem a listagem e
podem criar somente o acesso inicial “somente documentos”; o formulário não
oferece departamentos nem permissões adicionais nesse perfil.
Eles também podem editar os dados pessoais e o perfil documental do usuário,
sem visualizar o catálogo administrativo nem alterar departamentos, permissões,
senha ou estado da conta.

O cadastro agora coleta a classificação documental (Administrativo, Geral ou
Motorista), estado civil, decisão explícita sobre documento militar e qualquer
quantidade de dependentes. Antes da confirmação, a etapa de
prévia mostra a lista personalizada que será criada pela API. Não se solicita o
mesmo arquivo duas ou quatro vezes: a foto 3x4 digital é um único item.

Depois do upload, a Server Action conclui a pré-validação e a tela indica revisão
humana pendente. Aprovação, recusa ou reenvio registram motivo, validade e
conferência do original quando aplicável.

Enquanto o documento aguarda revisão, o titular pode substituir o arquivo ou
remover o envio para tentar novamente. Depois da aprovação, a exclusão aparece
somente para quem gerencia documentos e exige motivo. Arquivos são visualizados
em modal, sem abrir outra aba do navegador.

Na solicitação individual, RH/DP pode incluir um tipo documental e alterar cada
item para obrigatório, opcional ou dispensado, sempre informando motivo. Arquivos
e versões anteriores são preservados. A mesma tela oferece XLSX individual em
quatro abas e ZIP com todos os arquivos daquele funcionário.

**Criar solicitação avulsa** aceita vários usuários e vários tipos documentais.
O formulário identifica pessoas com nome, username e e-mail, oferece seleção de
todos os documentos e envia um único comando à API. O resultado atualiza o
dossiê documental existente de cada usuário; um registro novo só é criado quando
ainda não existe dossiê. Extração, histórico e downloads continuam individuais.
Documentos de cônjuge, filhos e situação militar são ignorados para
os usuários cujo perfil não se aplica; a tela informa quantas combinações foram
ignoradas.

A gestão mostra o nome do funcionário como título, pesquisa por nome/e-mail,
traduz os filtros de status e contexto e separa, em abas, funcionários com
pendências, completos e todos. A revisão abre em um diálogo amplo. Em **Meus
documentos**, a consulta é sempre limitada ao usuário autenticado e apresenta
um único cartão de dossiê, priorizando aguardando envio, aguardando revisão e
aprovado; documentos aprovados ficam recolhidos em um Accordion.

Para filhos, cada tipo documental aparece uma vez na solicitação e aceita vários
arquivos. O snapshot registra quais dependentes se aplicam: vacinação para
menores de 7 anos, atestado escolar para maiores de 7 até 16 anos e os demais
documentos de filhos para todos os dependentes cadastrados.

## Teste manual

1. execute migration e bootstrap da Tenant API;
2. crie um usuário de Departamento Pessoal com permissões documentais;
3. crie um candidato no modo “somente documentos”, informe dois dependentes de
   idades diferentes e confira a prévia antes de confirmar;
4. abra a solicitação gerada automaticamente em **Gestão documental**;
5. conclua o primeiro acesso e confirme o redirecionamento;
6. envie arquivos em **Meus documentos**;
7. retorne com o revisor e registre uma decisão humana;
8. crie uma solicitação avulsa para dois usuários, selecione vários documentos e
   confira que os dois dossiês individuais foram atualizados sem duplicidade;
9. altere uma exigência para opcional/dispensada e confirme o motivo no histórico;
10. confirme versões, conteúdo privado, XLSX individual e ZIP do funcionário.
