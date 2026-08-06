import { cva } from 'class-variance-authority';

export const loginPageStyles = {
  page: cva(
    'lume-auth-background relative isolate flex min-h-screen items-center justify-center overflow-hidden px-4 py-10',
  ),

  themeToggle: cva('absolute top-4 right-4'),

  card: cva(
    'w-full max-w-md gap-0 rounded-3xl border border-border/80 bg-card/95 py-0 shadow-[0_24px_80px_-36px_color-mix(in_srgb,var(--foreground)_35%,transparent)] backdrop-blur-sm',
  ),

  cardHeader: cva('items-center gap-0 px-8 pt-9 text-center'),

  brand: cva('mb-3'),

  platformName: cva('mb-3 text-xs font-semibold uppercase tracking-[0.22em] text-primary-emphasis'),

  title: cva('text-3xl font-bold text-foreground'),

  description: cva('mt-2 text-sm text-muted-foreground'),

  cardContent: cva('px-8 pb-8 pt-8'),

  form: cva('space-y-5'),

  fieldGroup: cva('space-y-2'),

  label: cva('text-sm font-medium text-foreground'),

  passwordHeader: cva('flex items-center justify-between gap-4'),

  input: cva('h-12 bg-background/80 px-4', {
    variants: {
      hasAction: {
        true: 'pr-20',
        false: '',
      },
    },
    defaultVariants: {
      hasAction: false,
    },
  }),

  passwordContainer: cva('relative'),

  passwordAction: cva(
    'absolute inset-y-0 right-0 px-4 text-sm font-medium text-muted-foreground transition hover:text-foreground',
  ),

  forgotPassword: cva('text-sm font-medium text-primary-emphasis transition hover:text-foreground'),

  fieldError: cva('text-sm text-destructive-emphasis'),

  rememberLabel: cva('flex cursor-pointer items-center gap-3 text-sm text-foreground'),

  submitButton: cva('h-12 w-full text-sm font-semibold'),
};
