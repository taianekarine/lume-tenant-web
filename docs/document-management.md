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

Depois do upload, a Server Action conclui a pré-validação e a tela indica revisão
humana pendente. Aprovação, recusa ou reenvio registram motivo, validade e
conferência do original quando aplicável.

## Teste manual

1. execute migration e bootstrap da Tenant API;
2. crie um usuário de Departamento Pessoal com permissões documentais;
3. crie um candidato no modo “somente documentos”;
4. crie uma solicitação em **Gestão documental**;
5. conclua o primeiro acesso e confirme o redirecionamento;
6. envie arquivos em **Meus documentos**;
7. retorne com o revisor e registre uma decisão humana;
8. confirme histórico, versões, conteúdo privado e exportação XLSX.
