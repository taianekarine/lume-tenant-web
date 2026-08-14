import { buildPaginationItems } from './pagination';

describe('buildPaginationItems', () => {
  it('exibe todas as páginas quando o lote é pequeno', () => {
    expect(buildPaginationItems(2, 4)).toEqual([1, 2, 3, 4]);
  });

  it('mantém uma janela curta em lotes com milhares de conversas', () => {
    expect(buildPaginationItems(125, 250)).toEqual([
      1,
      'ellipsis-start',
      123,
      124,
      125,
      126,
      127,
      'ellipsis-end',
      250,
    ]);
  });
});
