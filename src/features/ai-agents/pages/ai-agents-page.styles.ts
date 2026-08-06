import { cva } from 'class-variance-authority';

export const aiAgentsPageStyles = {
  content: cva('mx-auto w-full max-w-6xl px-4 py-5 sm:px-6 sm:py-6 lg:px-8'),

  eyebrow: cva('text-sm font-semibold text-primary-emphasis'),

  title: cva('mt-1 max-w-3xl text-2xl font-bold tracking-tight sm:text-3xl'),

  description: cva('mt-1 max-w-3xl text-sm leading-6 text-muted-foreground'),

  notice: cva(
    'mt-5 flex max-w-3xl items-start gap-3 rounded-2xl border border-primary/30 bg-primary/10 p-4 text-sm leading-6 text-foreground',
  ),

  noticeIcon: cva('mt-0.5 size-5 shrink-0 text-primary-emphasis'),

  noticeTitle: cva('font-bold'),

  noticeDescription: cva('mt-1 text-muted-foreground'),
};
