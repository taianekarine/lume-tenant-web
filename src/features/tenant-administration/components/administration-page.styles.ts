import { cva } from 'class-variance-authority';

export const administrationStyles = {
  content: 'mx-auto w-full max-w-7xl px-6 py-10',
  header: 'mb-8 flex flex-wrap items-end justify-between gap-4',
  eyebrow: 'text-xs font-bold uppercase tracking-[0.18em] text-primary-emphasis',
  title: 'mt-2 text-3xl font-extrabold tracking-tight text-foreground',
  description: 'mt-2 max-w-3xl text-sm leading-6 text-muted-foreground',
  panel: 'rounded-2xl bg-card p-6 shadow-sm ring-1 ring-border',
  chips: 'mt-3 flex flex-wrap gap-2',
  chip: 'rounded-full bg-muted px-2.5 py-1 text-xs font-semibold text-muted-foreground',
  definitionGrid: 'mt-5 grid gap-4 sm:grid-cols-2',
  definition: 'rounded-xl bg-muted/50 p-4',
  definitionLabel: 'text-xs font-bold uppercase tracking-wider text-muted-foreground',
  definitionValue: 'mt-1 break-words text-sm font-semibold text-foreground',
};

export const administrationStatus = cva('inline-flex rounded-full px-2.5 py-1 text-xs font-bold', {
  variants: {
    state: {
      active: 'bg-success/15 text-success-emphasis',
      inactive: 'bg-muted text-muted-foreground',
      warning: 'bg-warning/15 text-warning-emphasis',
      danger: 'bg-destructive/15 text-destructive-emphasis',
    },
  },
});
