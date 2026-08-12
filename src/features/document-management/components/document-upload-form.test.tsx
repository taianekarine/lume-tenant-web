import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { DocumentUploadForm } from './document-upload-form';

const mockRefresh = jest.fn();
const fetchMock = jest.fn();

jest.mock('next/navigation', () => ({
  useRouter: () => ({ refresh: mockRefresh }),
}));

function renderForm(requiresFrontBack = false) {
  return render(
    <DocumentUploadForm
      uploadUrl="/api/document-management/items/document-1/submissions/complete"
      itemId="document-1"
      accepts={['application/pdf', 'image/jpeg', 'image/png']}
      requiresFrontBack={requiresFrontBack}
      repeatableByDependent={false}
      allowsMultiplePages={false}
      replace={false}
    />,
  );
}

describe('DocumentUploadForm', () => {
  beforeEach(() => {
    jest.restoreAllMocks();
    mockRefresh.mockReset();
    fetchMock.mockReset();
    Object.defineProperty(globalThis, 'fetch', {
      configurable: true,
      writable: true,
      value: fetchMock,
    });
  });

  it('só monta os seletores nativos do documento escolhido', () => {
    const { container } = renderForm();

    expect(container.querySelectorAll('input[type="file"]')).toHaveLength(0);

    fireEvent.click(screen.getByRole('button', { name: 'Selecionar arquivo' }));

    const inputs = container.querySelectorAll('input[type="file"]');
    expect(inputs).toHaveLength(2);
    expect(inputs[0]).not.toHaveAttribute('capture');
    expect(inputs[0]).toHaveAttribute('accept', 'application/pdf,image/jpeg,image/png');
    expect(inputs[1]).toHaveAttribute('capture', 'environment');
    expect(inputs[1]).toHaveAttribute('accept', 'image/jpeg,image/png');
  });

  it('envia o multipart pela rota autenticada sem usar Server Action', async () => {
    const interaction = userEvent.setup();
    fetchMock.mockResolvedValue(new Response(JSON.stringify({ request: {} }), { status: 200 }));
    const { container } = renderForm();

    fireEvent.click(screen.getByRole('button', { name: 'Selecionar arquivo' }));
    const picker = container.querySelector('#document-1-single-picker') as HTMLInputElement;
    await interaction.upload(picker, new File(['imagem'], 'documento.jpg', { type: 'image/jpeg' }));
    await interaction.click(screen.getByRole('button', { name: 'Enviar documento' }));

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
    expect(fetchMock).toHaveBeenCalledWith(
      '/api/document-management/items/document-1/submissions/complete',
      expect.objectContaining({ method: 'POST', body: expect.any(FormData) }),
    );
    const upload = fetchMock.mock.calls[0]?.[1]?.body as FormData;
    expect([...upload.keys()]).toEqual(['commandId', 'files', 'sides', 'pageNumbers']);
    expect((upload.get('files') as File).name).toBe('documento.jpg');
    await waitFor(() => expect(mockRefresh).toHaveBeenCalledTimes(1));
    expect(screen.getByRole('status')).toHaveTextContent('Documento enviado para revisão.');
  });

  it('bloqueia o envio antes da rede quando um arquivo excede 25 MB', async () => {
    const interaction = userEvent.setup();
    const { container } = renderForm();

    fireEvent.click(screen.getByRole('button', { name: 'Selecionar arquivo' }));
    const picker = container.querySelector('#document-1-single-picker') as HTMLInputElement;
    const oversized = new File(['x'], 'grande.jpg', { type: 'image/jpeg' });
    Object.defineProperty(oversized, 'size', { value: 25 * 1024 * 1024 + 1 });
    await interaction.upload(picker, oversized);
    await interaction.click(screen.getByRole('button', { name: 'Enviar documento' }));

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Cada arquivo deve possuir no máximo 25 MB.',
    );
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
