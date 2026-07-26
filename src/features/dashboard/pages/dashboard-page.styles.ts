import { cva } from 'class-variance-authority';

export const dashboardPageStyles = {
  content: cva('mx-auto w-full max-w-6xl px-4 py-10 sm:px-6 sm:py-14 lg:px-8'),

  eyebrow: cva('text-sm font-semibold text-blue-600'),

  title: cva('mt-2 max-w-3xl text-3xl font-bold tracking-tight sm:text-4xl'),

  description: cva('mt-3 max-w-2xl text-base leading-7 text-slate-600'),

  cardGrid: cva('mt-10 grid gap-5 md:grid-cols-3'),

  card: cva('gap-0 border-0 bg-white py-0 shadow-sm ring-slate-200'),

  cardHeader: cva('gap-3 px-6 pt-6'),

  cardIcon: cva('flex size-10 items-center justify-center rounded-xl bg-blue-50 text-blue-700'),

  cardTitle: cva('text-base font-bold text-slate-950'),

  cardDescription: cva('leading-6 text-slate-600'),

  cardContent: cva('px-6 pb-6 pt-4'),

  cardValue: cva('text-2xl font-bold text-slate-950'),

  cardDetail: cva('mt-1 text-sm leading-6 text-slate-500'),
};
