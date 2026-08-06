import { cva } from 'class-variance-authority';

export const logoutButtonStyles = {
  form: cva('flex items-center gap-2'),

  button: cva('max-sm:[&_span]:sr-only'),

  feedback: cva('max-w-xs text-right text-xs font-medium text-destructive-emphasis'),
};
