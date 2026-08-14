export type PaginationItem = number | 'ellipsis-start' | 'ellipsis-end';

export function buildPaginationItems(currentPage: number, pageCount: number): PaginationItem[] {
  if (pageCount <= 7) {
    return Array.from({ length: pageCount }, (_, index) => index + 1);
  }

  const pages = new Set([1, pageCount]);
  for (let value = currentPage - 2; value <= currentPage + 2; value += 1) {
    if (value > 1 && value < pageCount) pages.add(value);
  }

  const ordered = [...pages].sort((left, right) => left - right);
  const items: PaginationItem[] = [];
  ordered.forEach((value, index) => {
    const previous = ordered[index - 1];
    if (previous !== undefined && value - previous > 1) {
      items.push(previous === 1 ? 'ellipsis-start' : 'ellipsis-end');
    }
    items.push(value);
  });
  return items;
}
