import { cva } from 'class-variance-authority';

export const administrationStyles = {
  content: 'mx-auto w-full max-w-7xl px-6 py-10',
  header: 'mb-8 flex flex-wrap items-end justify-between gap-4',
  eyebrow: 'text-xs font-bold uppercase tracking-[0.18em] text-blue-700 dark:text-blue-300',
  title: 'mt-2 text-3xl font-extrabold tracking-tight text-foreground',
  description: 'mt-2 max-w-3xl text-sm leading-6 text-muted-foreground',
  grid: 'grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px]',
  panel: 'rounded-2xl bg-card p-6 shadow-sm ring-1 ring-border',
  panelTitle: 'text-lg font-bold text-foreground',
  panelDescription: 'mt-1 text-sm text-muted-foreground',
  list: 'mt-5 space-y-3',
  item: 'rounded-xl border border-border p-4',
  itemHeader: 'flex flex-wrap items-start justify-between gap-3',
  itemTitle: 'font-bold text-foreground',
  itemMeta: 'mt-1 text-xs text-muted-foreground',
  chips: 'mt-3 flex flex-wrap gap-2',
  chip: 'rounded-full bg-muted px-2.5 py-1 text-xs font-semibold text-muted-foreground',
  actions: 'mt-4 flex flex-wrap gap-2',
  form: 'mt-5 space-y-5',
  field: 'space-y-1.5',
  label: 'text-sm font-semibold text-foreground',
  input:
    'h-11 w-full rounded-xl border border-input bg-background px-3 text-sm text-foreground outline-none transition focus:border-blue-600 focus:ring-3 focus:ring-blue-600/15',
  textarea:
    'min-h-24 w-full rounded-xl border border-input bg-background px-3 py-2 text-sm text-foreground outline-none transition focus:border-blue-600 focus:ring-3 focus:ring-blue-600/15',
  checkboxGrid: 'grid gap-2 sm:grid-cols-2',
  checkbox: 'flex items-start gap-2 rounded-lg border border-border p-3 text-sm text-foreground',
  separator: 'my-6 border-t border-border',
  empty: 'mt-5 rounded-xl bg-muted/50 p-6 text-center text-sm text-muted-foreground',
  definitionGrid: 'mt-5 grid gap-4 sm:grid-cols-2',
  definition: 'rounded-xl bg-muted/50 p-4',
  definitionLabel: 'text-xs font-bold uppercase tracking-wider text-muted-foreground',
  definitionValue: 'mt-1 break-words text-sm font-semibold text-foreground',
};

export const administrationButton = cva(
  'inline-flex min-h-10 items-center justify-center rounded-xl px-4 text-sm font-bold transition disabled:cursor-not-allowed disabled:opacity-50',
  {
    variants: {
      variant: {
        primary: 'bg-blue-700 text-white hover:bg-blue-800',
        secondary: 'bg-muted text-foreground hover:bg-muted/80',
        danger:
          'bg-red-50 text-red-700 hover:bg-red-100 dark:bg-red-950/50 dark:text-red-200 dark:hover:bg-red-950/70',
      },
    },
    defaultVariants: { variant: 'primary' },
  },
);

export const administrationStatus = cva('inline-flex rounded-full px-2.5 py-1 text-xs font-bold', {
  variants: {
    state: {
      active: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200',
      inactive: 'bg-muted text-muted-foreground',
      warning: 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-200',
      danger: 'bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-200',
    },
  },
});
