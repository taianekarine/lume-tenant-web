import { cva } from 'class-variance-authority';

export const logoutButtonStyles = {
  form: cva('flex flex-col items-stretch gap-2 sm:items-end'),

  button: cva('w-full sm:w-auto'),

  feedback: cva('max-w-xs text-right text-xs font-medium text-red-600'),
};
