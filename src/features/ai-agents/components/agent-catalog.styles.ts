import { cva } from 'class-variance-authority';

export const agentCatalogStyles = {
  section: cva('mt-10'),

  searchHeader: cva(
    'flex flex-col gap-4 rounded-2xl bg-card p-5 shadow-sm ring-1 ring-border sm:flex-row sm:items-end sm:justify-between',
  ),

  field: cva('w-full max-w-xl'),

  label: cva('text-sm font-semibold text-foreground'),

  inputContainer: cva('relative mt-2'),

  searchIcon: cva(
    'pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-muted-foreground',
  ),

  input: cva('h-11 rounded-xl pl-11 pr-4 transition-colors duration-200'),

  resultCount: cva('text-sm font-medium text-muted-foreground'),

  grid: cva('mt-6 grid gap-5 md:grid-cols-2 xl:grid-cols-3'),

  card: cva('gap-0 bg-card py-0 shadow-sm ring-border'),

  cardHeader: cva('gap-3 px-6 pt-6'),

  cardHeading: cva('flex items-start justify-between gap-4'),

  cardIcon: cva(
    'flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary-emphasis',
  ),

  status: cva(
    'rounded-full bg-warning/10 px-2.5 py-1 text-xs font-semibold text-warning-emphasis ring-1 ring-warning/25',
  ),

  category: cva('text-xs font-semibold uppercase tracking-wider text-primary-emphasis'),

  title: cva('text-lg font-bold text-foreground'),

  description: cva('leading-6 text-muted-foreground'),

  cardContent: cva('px-6 pb-6 pt-5'),

  scopeTitle: cva('text-sm font-semibold text-foreground'),

  capabilityList: cva('mt-3 space-y-2'),

  capability: cva('flex items-start gap-2 text-sm leading-6 text-muted-foreground'),

  capabilityIcon: cva('mt-2 size-1.5 shrink-0 rounded-full bg-primary'),

  emptyState: cva(
    'mt-6 rounded-2xl border border-dashed border-border bg-card px-6 py-12 text-center',
  ),

  emptyTitle: cva('text-base font-bold text-foreground'),

  emptyDescription: cva('mt-2 text-sm text-muted-foreground'),
};
