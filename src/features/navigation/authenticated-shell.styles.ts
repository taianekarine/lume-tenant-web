import { cva } from 'class-variance-authority';

export const authenticatedShellStyles = {
  shell: cva('min-h-screen bg-slate-50 text-slate-950'),

  header: cva('border-b border-slate-200 bg-white'),

  headerContent: cva(
    'mx-auto flex w-full max-w-6xl flex-col gap-4 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6 lg:px-8',
  ),

  brand: cva('flex items-center gap-3 font-semibold text-slate-950'),

  brandIcon: cva(
    'flex size-10 items-center justify-center rounded-xl bg-blue-600 text-white shadow-sm',
  ),

  brandText: cva('flex flex-col'),

  brandName: cva('text-sm font-bold'),

  brandArea: cva('text-xs font-medium text-slate-500'),

  navigation: cva('flex w-full flex-col gap-3 sm:w-auto sm:flex-row sm:items-start'),

  siteLink: cva(
    'inline-flex h-8 items-center justify-center gap-1.5 rounded-lg px-2.5 text-sm font-medium text-slate-600 transition hover:bg-slate-100 hover:text-slate-950 focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-blue-500/30',
  ),
};
