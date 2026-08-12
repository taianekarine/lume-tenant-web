import { fireEvent, render, screen } from '@testing-library/react';

import { DocumentUploadForm } from './document-upload-form';

describe('DocumentUploadForm', () => {
  it('reuses one lightweight input for file selection and camera capture', () => {
    const { container } = render(
      <DocumentUploadForm
        action={jest.fn()}
        itemId="document-1"
        accepts={['application/pdf', 'image/jpeg', 'image/png']}
        requiresFrontBack={false}
        repeatableByDependent
        allowsMultiplePages={false}
        replace={false}
      />,
    );
    const input = container.querySelector('input[type="file"]') as HTMLInputElement;
    const showPicker = jest.fn();
    Object.defineProperty(input, 'showPicker', { configurable: true, value: showPicker });

    expect(container.querySelectorAll('input[type="file"]')).toHaveLength(1);

    fireEvent.click(screen.getByRole('button', { name: 'Usar câmera' }));
    expect(input).toHaveAttribute('capture', 'environment');
    expect(input.accept).toBe('image/jpeg,image/png');
    expect(input.multiple).toBe(false);

    fireEvent.click(screen.getByRole('button', { name: 'Selecionar arquivo' }));
    expect(input).not.toHaveAttribute('capture');
    expect(input.accept).toBe('application/pdf,image/jpeg,image/png');
    expect(input.multiple).toBe(true);
    expect(showPicker).toHaveBeenCalledTimes(2);
  });
});
