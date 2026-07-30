import { cva } from 'class-variance-authority';

export const loginPageStyles = {
  page: cva(
    'relative flex min-h-screen items-center justify-center bg-slate-100 px-4 py-10 dark:bg-slate-950',
  ),

  themeToggle: cva('absolute top-4 right-4'),

  card: cva('w-full max-w-md gap-0 rounded-2xl bg-card py-0 shadow-2xl'),

  cardHeader: cva('gap-0 px-8 pt-8 text-center'),

  platformName: cva('mb-2 text-sm font-semibold uppercase tracking-[0.2em] text-blue-600'),

  title: cva('text-3xl font-bold text-foreground'),

  description: cva('mt-2 text-sm text-muted-foreground'),

  cardContent: cva('px-8 pb-8 pt-8'),

  form: cva('space-y-5'),

  fieldGroup: cva('space-y-2'),

  label: cva('text-sm font-medium text-foreground'),

  passwordHeader: cva('flex items-center justify-between gap-4'),

  input: cva(
    'h-12 w-full rounded-lg border bg-background px-4 text-sm text-foreground outline-none transition placeholder:text-muted-foreground focus:ring-2',
    {
      variants: {
        hasAction: {
          true: 'pr-20',
          false: '',
        },
        invalid: {
          true: 'border-red-500 focus:border-red-500 focus:ring-red-500/20',
          false: 'border-input focus:border-blue-600 focus:ring-blue-600/20',
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
    'absolute inset-y-0 right-0 px-4 text-sm font-medium text-muted-foreground transition hover:text-foreground',
  ),

  forgotPassword: cva('text-sm font-medium text-blue-600 transition hover:text-blue-700'),

  fieldError: cva('text-sm text-red-600'),

  rememberLabel: cva('flex cursor-pointer items-center gap-3 text-sm text-foreground'),

  checkbox: cva('size-4 rounded border-input accent-blue-600'),

  submitButton: cva('h-12 w-full text-sm font-semibold'),
};
