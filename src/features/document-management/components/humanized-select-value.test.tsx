import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { render, screen } from '@testing-library/react';

import { HumanizedSelectValue } from './humanized-select-value';
import { Select, SelectContent, SelectItem, SelectTrigger } from '@/shared/ui/select';

describe('HumanizedSelectValue', () => {
  it('renderiza o rótulo humanizado dentro da fronteira client', () => {
    render(
      <Select defaultValue="approved">
        <SelectTrigger>
          <HumanizedSelectValue labels={{ approved: 'Aprovar' }} />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="approved">Aprovar</SelectItem>
        </SelectContent>
      </Select>,
    );

    expect(screen.getByText('Aprovar')).toBeInTheDocument();
  });

  it('não deixa render functions de SelectValue atravessarem o Server Component', () => {
    const workspaceSource = readFileSync(
      join(
        process.cwd(),
        'src/features/document-management/components/document-request-workspace.tsx',
      ),
      'utf8',
    );
    const clientValueSource = readFileSync(
      join(process.cwd(), 'src/features/document-management/components/humanized-select-value.tsx'),
      'utf8',
    );

    expect(workspaceSource).not.toMatch(/<SelectValue[\s\S]*?\{\s*\([^)]*\)\s*=>/);
    expect(workspaceSource).toContain('<HumanizedSelectValue');
    expect(clientValueSource.startsWith("'use client';")).toBe(true);
  });
});
