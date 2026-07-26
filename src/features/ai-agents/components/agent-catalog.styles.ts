import { cva } from 'class-variance-authority';

export const agentCatalogStyles = {
  section: cva('mt-10'),

  searchHeader: cva(
    'flex flex-col gap-4 rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200 sm:flex-row sm:items-end sm:justify-between',
  ),

  field: cva('w-full max-w-xl'),

  label: cva('text-sm font-semibold text-slate-800'),

  inputContainer: cva('relative mt-2'),

  searchIcon: cva(
    'pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-slate-400',
  ),

  input: cva(
    'h-11 w-full rounded-xl border border-slate-300 bg-white pl-11 pr-4 text-sm text-slate-950 outline-none transition placeholder:text-slate-400 focus:border-blue-600 focus:ring-3 focus:ring-blue-600/15',
  ),

  resultCount: cva('text-sm font-medium text-slate-500'),

  grid: cva('mt-6 grid gap-5 md:grid-cols-2 xl:grid-cols-3'),

  card: cva('gap-0 bg-white py-0 shadow-sm ring-slate-200'),

  cardHeader: cva('gap-3 px-6 pt-6'),

  cardHeading: cva('flex items-start justify-between gap-4'),

  cardIcon: cva(
    'flex size-10 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-700',
  ),

  status: cva(
    'rounded-full bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-800 ring-1 ring-amber-200',
  ),

  category: cva('text-xs font-semibold uppercase tracking-wider text-blue-600'),

  title: cva('text-lg font-bold text-slate-950'),

  description: cva('leading-6 text-slate-600'),

  cardContent: cva('px-6 pb-6 pt-5'),

  scopeTitle: cva('text-sm font-semibold text-slate-800'),

  capabilityList: cva('mt-3 space-y-2'),

  capability: cva('flex items-start gap-2 text-sm leading-6 text-slate-600'),

  capabilityIcon: cva('mt-2 size-1.5 shrink-0 rounded-full bg-blue-600'),

  emptyState: cva(
    'mt-6 rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-12 text-center',
  ),

  emptyTitle: cva('text-base font-bold text-slate-950'),

  emptyDescription: cva('mt-2 text-sm text-slate-600'),
};
