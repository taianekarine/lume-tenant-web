import { cva } from 'class-variance-authority';

export const aiAgentsPageStyles = {
  content: cva('mx-auto w-full max-w-6xl px-4 py-10 sm:px-6 sm:py-14 lg:px-8'),

  eyebrow: cva('text-sm font-semibold text-blue-600'),

  title: cva('mt-2 max-w-3xl text-3xl font-bold tracking-tight sm:text-4xl'),

  description: cva('mt-3 max-w-3xl text-base leading-7 text-slate-600'),

  notice: cva(
    'mt-8 flex max-w-3xl items-start gap-3 rounded-2xl border border-blue-200 bg-blue-50 p-5 text-sm leading-6 text-blue-950',
  ),

  noticeIcon: cva('mt-0.5 size-5 shrink-0 text-blue-700'),

  noticeTitle: cva('font-bold'),

  noticeDescription: cva('mt-1 text-blue-900'),
};
