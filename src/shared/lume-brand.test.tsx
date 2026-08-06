import { render, screen } from '@testing-library/react';

import { LumeBrand, LumeBrandMark } from './lume-brand';

describe('LumeBrand', () => {
  it('renders the accessible sunrise mark when it is used by itself', () => {
    render(<LumeBrandMark />);

    expect(screen.getByRole('img', { name: 'Símbolo do Lume' })).toHaveAttribute(
      'src',
      expect.stringContaining('lume-sunrise-spark-animated.svg'),
    );
  });

  it('renders the accessible horizontal lockup', () => {
    render(<LumeBrand />);

    expect(screen.getByRole('img', { name: 'Lume' })).toHaveAttribute(
      'src',
      expect.stringContaining('lume-horizontal-lockup-animated.svg'),
    );
  });
});
