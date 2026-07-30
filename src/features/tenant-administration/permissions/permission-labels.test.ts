import { getPermissionActionLabel, getPermissionResourceLabel } from './permission-labels';

describe('permission labels', () => {
  it.each([
    ['dashboard', 'Painel'],
    ['users', 'Usuários'],
    ['human-resources', 'Recursos Humanos'],
    ['personnel-department', 'Departamento Pessoal'],
    ['ai-agents', 'Agentes de IA'],
    ['whatsapp-conversations', 'Painel WhatsApp'],
    ['service-requests', 'Solicitações de serviço'],
    ['license', 'Licença'],
  ])('translates the resource %s', (resource, label) => {
    expect(getPermissionResourceLabel(resource)).toBe(label);
  });

  it.each([
    ['view', 'Visualizar'],
    ['create', 'Criar'],
    ['update', 'Editar'],
    ['delete', 'Excluir'],
    ['manage', 'Gerenciar'],
    ['use', 'Utilizar'],
    ['approve', 'Aprovar'],
    ['export', 'Exportar'],
  ])('translates the action %s', (action, label) => {
    expect(getPermissionActionLabel(action)).toBe(label);
  });

  it('keeps catalog additions usable without a frontend allow-list', () => {
    expect(getPermissionResourceLabel('quality-assurance')).toBe('Módulo adicional');
    expect(getPermissionActionLabel('review')).toBe('Ação disponível');
  });
});
