# Gestão documental no Tenant Web

O frontend oferece duas áreas:

- `/documents`: solicitações próprias, checklist, progresso, prazo e reenvio;
- `/document-management`: acompanhamento e revisão por RH, DP ou Gerência.

Server Components, Server Actions e `/documents/files/:fileId` usam gateway
server-only. O proxy repassa somente cabeçalhos seguros e força
`Cache-Control: private, no-store`.

Usuários com `documentAccessMode=document-portal` são direcionados a
`/documents` após o login e veem somente a navegação documental. A API também
limita suas permissões; a proteção não depende do menu.

O menu **Pessoas** exibe **Usuários** e **Gestão documental** conforme as
permissões. Administradores mantêm edição integral de departamentos,
permissões e estado das contas. RH e Departamento Pessoal veem a listagem e
podem criar somente o acesso inicial “somente documentos”; o formulário não
oferece departamentos nem permissões adicionais nesse perfil.

O cadastro agora coleta cargo, estado civil, decisão explícita sobre documento
militar e qualquer quantidade de dependentes. Antes da confirmação, a etapa de
prévia mostra a lista personalizada que será criada pela API. Não se solicita o
mesmo arquivo duas ou quatro vezes: a foto 3x4 digital é um único item.

Depois do upload, a Server Action conclui a pré-validação e a tela indica revisão
humana pendente. Aprovação, recusa ou reenvio registram motivo, validade e
conferência do original quando aplicável.

Na solicitação individual, RH/DP pode incluir um tipo documental e alterar cada
item para obrigatório, opcional ou dispensado, sempre informando motivo. Arquivos
e versões anteriores são preservados. A mesma tela oferece XLSX individual em
quatro abas e ZIP com todos os arquivos daquele funcionário.

## Teste manual

1. execute migration e bootstrap da Tenant API;
2. crie um usuário de Departamento Pessoal com permissões documentais;
3. crie um candidato no modo “somente documentos”, informe dois dependentes de
   idades diferentes e confira a prévia antes de confirmar;
4. abra a solicitação gerada automaticamente em **Gestão documental**;
5. conclua o primeiro acesso e confirme o redirecionamento;
6. envie arquivos em **Meus documentos**;
7. retorne com o revisor e registre uma decisão humana;
8. altere uma exigência para opcional/dispensada e confirme o motivo no histórico;
9. confirme versões, conteúdo privado, XLSX individual e ZIP do funcionário.
