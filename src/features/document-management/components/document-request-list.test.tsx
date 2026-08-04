import { render, screen } from '@testing-library/react';

import type { DocumentRequestSummary } from '../domain';
import { DocumentRequestList } from './document-request-list';

const request: DocumentRequestSummary = {
  id: '10000000-0000-4000-8000-000000000001',
  context: 'admission',
  status: 'pending-human-review',
  deadline: '2026-08-20T12:00:00.000Z',
  version: 3,
  subject: {
    id: '20000000-0000-4000-8000-000000000001',
    name: 'Ana Candidata',
    email: 'ana@example.com',
  },
  checklist: {
    id: '30000000-0000-4000-8000-000000000001',
    code: 'admission-general',
    name: 'Documentação geral para registro',
    version: 1,
  },
  progress: { total: 4, approved: 2, pending: 2 },
  createdAt: '2026-08-04T12:00:00.000Z',
  updatedAt: '2026-08-04T13:00:00.000Z',
};

describe('DocumentRequestList', () => {
  it('renders progress and routes the owner to the private document area', () => {
    render(<DocumentRequestList requests={[request]} />);
    expect(screen.getByText('50%')).toBeInTheDocument();
    expect(screen.getByRole('link')).toHaveAttribute('href', `/documents/${request.id}`);
    expect(screen.getByText('Aguardando revisão')).toBeInTheDocument();
  });

  it('shows the subject and management route for people operations', () => {
    render(<DocumentRequestList requests={[request]} management />);
    expect(screen.getByText(/Ana Candidata/)).toBeInTheDocument();
    expect(screen.getByRole('link')).toHaveAttribute('href', `/document-management/${request.id}`);
  });
});
