import { fireEvent, render, screen } from '@testing-library/react';

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
    expect(screen.getByText(/Meu dossi/)).toBeInTheDocument();
    expect(screen.getByText('Aguardando revisão')).toBeInTheDocument();
  });

  it('shows one dossier card when legacy requests belong to the same user', () => {
    render(
      <DocumentRequestList
        requests={[
          request,
          {
            ...request,
            id: '10000000-0000-4000-8000-000000000002',
            context: 'regularization',
            status: 'pending-upload',
            updatedAt: '2026-08-05T13:00:00.000Z',
          },
        ]}
      />,
    );

    expect(screen.getAllByRole('link')).toHaveLength(1);
    expect(screen.getByRole('link')).toHaveAttribute(
      'href',
      '/documents/10000000-0000-4000-8000-000000000002',
    );
  });

  it('shows the subject and opens document review in a modal', () => {
    render(<DocumentRequestList requests={[request]} management />);
    expect(screen.getByText(/Ana Candidata/)).toBeInTheDocument();
    const pendingTab = screen.getByRole('tab', { name: 'Com pendências, 1' });
    expect(pendingTab).toHaveClass('min-w-0');
    expect(pendingTab.parentElement).toHaveClass('grid', 'w-full', 'grid-cols-3');
    fireEvent.click(screen.getByRole('button', { name: /Revisar documentos de Ana Candidata/ }));
    expect(screen.getAllByText('Todos')).toHaveLength(2);
    expect(screen.getByRole('dialog')).toHaveClass('w-[96vw]', 'sm:max-w-[1500px]');
    expect(screen.getByTitle(/Revisão documental de Ana Candidata/)).toHaveAttribute(
      'src',
      `/document-management/${request.id}?embedded=1`,
    );
  });
});
