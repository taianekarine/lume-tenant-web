import { paginationItems } from './api-usage-dashboard';

describe('paginationItems', () => {
  it('shows every page when the result is short', () => {
    expect(paginationItems(2, 4)).toEqual([1, 2, 3, 4]);
  });

  it('keeps the current page and the boundaries in a long result', () => {
    expect(paginationItems(6, 12)).toEqual([1, 'ellipsis-start', 5, 6, 7, 'ellipsis-end', 12]);
  });
});
