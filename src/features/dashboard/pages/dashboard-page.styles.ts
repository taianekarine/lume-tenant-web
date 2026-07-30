import { cva } from 'class-variance-authority';

export const dashboardPageStyles = {
  content: cva('mx-auto w-full max-w-[1500px] px-4 py-5 sm:px-6 sm:py-6 lg:px-8'),

  eyebrow: cva('text-sm font-semibold text-primary'),

  heading: cva('mt-1 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between'),

  title: cva('max-w-3xl text-2xl font-bold tracking-tight text-foreground sm:text-3xl'),

  description: cva('mt-1 max-w-3xl text-sm leading-6 text-muted-foreground'),

  liveBadge: cva(
    'inline-flex w-fit shrink-0 items-center gap-2 rounded-full bg-primary/10 px-3 py-1.5 text-xs font-semibold text-primary [&_svg]:size-3.5',
  ),

  errorBanner: cva(
    'mt-4 flex items-start gap-2 rounded-xl border border-destructive/20 bg-destructive/10 px-4 py-3 text-sm text-destructive [&_svg]:mt-0.5 [&_svg]:size-4 [&_svg]:shrink-0',
  ),

  graphGrid: cva('mt-6 grid gap-5 xl:grid-cols-2'),

  graphCard: cva('shadow-sm'),

  graphTitle: cva('text-base font-semibold'),

  graphContent: cva('space-y-5 pb-5'),

  graphRow: cva('space-y-2'),

  graphLabel: cva(
    'flex items-center justify-between gap-3 text-sm text-muted-foreground [&>strong]:font-semibold [&>strong]:text-foreground',
  ),

  graphTrack: cva('h-2.5 overflow-hidden rounded-full bg-muted'),

  graphBar: cva('block h-full rounded-full transition-[width] duration-500'),

  emptyGraph: cva(
    'rounded-xl border border-dashed border-border px-4 py-10 text-center text-sm text-muted-foreground',
  ),

  summaryCard: cva('mt-6 shadow-sm'),

  summaryContent: cva('flex items-center gap-4 p-5'),

  summaryIcon: cva(
    'flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary [&_svg]:size-5',
  ),
};
