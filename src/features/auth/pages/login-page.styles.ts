import { cva } from 'class-variance-authority';

export const loginPageStyles = {
  page: cva('flex min-h-screen items-center justify-center bg-slate-950 px-4 py-10'),

  card: cva('w-full max-w-md gap-0 rounded-2xl bg-white py-0 shadow-2xl ring-white/10'),

  cardHeader: cva('gap-0 px-8 pt-8 text-center'),

  platformName: cva('mb-2 text-sm font-semibold uppercase tracking-[0.2em] text-blue-600'),

  title: cva('text-3xl font-bold text-slate-950'),

  description: cva('mt-2 text-sm text-slate-600'),

  cardContent: cva('px-8 pb-8 pt-8'),

  form: cva('space-y-5'),

  fieldGroup: cva('space-y-2'),

  label: cva('text-sm font-medium text-slate-800'),

  passwordHeader: cva('flex items-center justify-between gap-4'),

  input: cva(
    'h-12 w-full rounded-lg border bg-white px-4 text-sm text-slate-950 outline-none transition placeholder:text-slate-400 focus:ring-2',
    {
      variants: {
        hasAction: {
          true: 'pr-20',
          false: '',
        },
        invalid: {
          true: 'border-red-500 focus:border-red-500 focus:ring-red-500/20',
          false: 'border-slate-300 focus:border-blue-600 focus:ring-blue-600/20',
        },
      },
      defaultVariants: {
        hasAction: false,
        invalid: false,
      },
    },
  ),

  passwordContainer: cva('relative'),

  passwordAction: cva(
    'absolute inset-y-0 right-0 px-4 text-sm font-medium text-slate-600 transition hover:text-slate-950',
  ),

  forgotPassword: cva('text-sm font-medium text-blue-600 transition hover:text-blue-700'),

  fieldError: cva('text-sm text-red-600'),

  rememberLabel: cva('flex cursor-pointer items-center gap-3 text-sm text-slate-700'),

  checkbox: cva('size-4 rounded border-slate-300 accent-blue-600'),

  submitButton: cva('h-12 w-full text-sm font-semibold'),
};
