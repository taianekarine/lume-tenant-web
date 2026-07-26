import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { AI_AGENT_CATALOG } from '../data';
import { AgentCatalog } from './agent-catalog';

describe('AgentCatalog', () => {
  it('presents the initial catalog and its preparation status', () => {
    render(<AgentCatalog agents={AI_AGENT_CATALOG} />);

    expect(screen.getByText('3 agentes encontrados')).toBeInTheDocument();
    expect(screen.getByText('Assistente de Operações')).toBeInTheDocument();
    expect(screen.getByText('Assistente Comercial')).toBeInTheDocument();
    expect(screen.getByText('Assistente Administrativo')).toBeInTheDocument();
    expect(screen.getAllByText('Em preparação')).toHaveLength(3);
  });

  it('filters agents by name, area or capability', async () => {
    const user = userEvent.setup();

    render(<AgentCatalog agents={AI_AGENT_CATALOG} />);

    await user.type(screen.getByRole('searchbox', { name: 'Buscar no catálogo' }), 'propostas');

    expect(screen.getByText('1 agente encontrado')).toBeInTheDocument();
    expect(screen.getByText('Assistente Comercial')).toBeInTheDocument();
    expect(screen.queryByText('Assistente de Operações')).not.toBeInTheDocument();
  });

  it('shows guidance when the search has no results', async () => {
    const user = userEvent.setup();

    render(<AgentCatalog agents={AI_AGENT_CATALOG} />);

    await user.type(screen.getByRole('searchbox', { name: 'Buscar no catálogo' }), 'jurídico');

    expect(screen.getByText('Nenhum agente encontrado')).toBeInTheDocument();
    expect(
      screen.getByText('Tente buscar por outro nome, área ou capacidade.'),
    ).toBeInTheDocument();
  });
});
