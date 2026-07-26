import { cva } from 'class-variance-authority';

export const whatsAppConversationsPageStyles = {
  content: cva('mx-auto w-full max-w-7xl px-4 py-10 sm:px-6 sm:py-14 lg:px-8'),

  eyebrow: cva('text-sm font-semibold text-emerald-700'),

  title: cva('mt-2 text-3xl font-bold tracking-tight text-slate-950 sm:text-4xl'),

  description: cva('mt-3 max-w-3xl text-base leading-7 text-slate-600'),

  metrics: cva('mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4'),

  metricCard: cva('gap-0 bg-white py-0 shadow-sm ring-slate-200'),

  metricHeader: cva('flex grid-cols-none flex-row items-center gap-3 px-5 pt-5'),

  metricIcon: cva('flex size-9 items-center justify-center rounded-xl [&_svg]:size-4', {
    variants: {
      tone: {
        blue: 'bg-blue-50 text-blue-700',
        amber: 'bg-amber-50 text-amber-700',
        green: 'bg-emerald-50 text-emerald-700',
        violet: 'bg-violet-50 text-violet-700',
      },
    },
    defaultVariants: {
      tone: 'blue',
    },
  }),

  metricTitle: cva('text-sm font-semibold text-slate-600'),

  metricContent: cva('px-5 pb-5 pt-3'),

  metricValue: cva('text-3xl font-bold tracking-tight text-slate-950'),
};
