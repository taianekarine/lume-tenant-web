import {
  getTenantDepartmentLabel,
  TENANT_DEPARTMENTS,
  TENANT_DEPARTMENT_LABELS,
} from './tenant-administration';

describe('tenant department catalog', () => {
  it('exposes all assignable departments with PT-BR labels', () => {
    expect(TENANT_DEPARTMENTS).toEqual([
      'commercial',
      'purchasing',
      'controllership',
      'personnel-department',
      'financial',
      'management',
      'maintenance',
      'monitoring',
      'operations',
      'information-technology',
    ]);
    expect(TENANT_DEPARTMENTS.map((department) => TENANT_DEPARTMENT_LABELS[department])).toEqual([
      'Comercial',
      'Compras',
      'Controladoria',
      'Departamento Pessoal',
      'Financeiro',
      'Gerência',
      'Manutenção',
      'Monitoramento',
      'Operacional',
      'Tecnologia da Informação (TI)',
    ]);
  });

  it('keeps known legacy records readable without exposing raw codes', () => {
    expect(getTenantDepartmentLabel('controlling')).toBe('Controladoria');
    expect(getTenantDepartmentLabel('unknown-department-code')).toBe('Departamento legado');
  });
});
