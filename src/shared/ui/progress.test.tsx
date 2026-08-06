import { render, screen } from '@testing-library/react';

import { Progress } from './progress';

describe('Progress', () => {
  it('exposes the current value to assistive technology', () => {
    render(<Progress value={42} aria-label="Conclusão da solicitação" />);

    expect(screen.getByRole('progressbar', { name: 'Conclusão da solicitação' })).toHaveAttribute(
      'aria-valuenow',
      '42',
    );
  });
});
