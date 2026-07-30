# Shared

Esta pasta concentra recursos reutilizáveis entre diferentes funcionalidades da aplicação.

Use esta pasta apenas para código realmente compartilhado.

Organização:

- ui: componentes visuais reutilizáveis
- hooks: hooks genéricos reutilizáveis
- lib: configurações e integrações de bibliotecas
- styles: estilos globais e utilitários de estilo
- types: tipos TypeScript compartilhados
- utils: funções utilitárias puras
- constants: constantes globais da aplicação

`current-user-avatar.tsx` concentra o estado visual da foto do usuário
autenticado. Monte `CurrentUserProfilePictureProvider` uma vez no shell,
publique alterações confirmadas com `publishCurrentUserProfilePicture` e use
`CurrentUserAvatar` nas superfícies que representam o atendente (sidebar,
mensagens e menus). O cache é isolado por usuário e não substitui a leitura
autoritativa da Tenant API.
