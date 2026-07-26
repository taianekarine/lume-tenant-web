'use client';

import { useActionState } from 'react';
import { LogOut } from 'lucide-react';

import { Button } from '@/shared/ui/button';

import { logoutAction, type LogoutActionState } from '../actions/logout-action';
import { logoutButtonStyles as styles } from './logout-button.styles';

const INITIAL_LOGOUT_STATE: LogoutActionState = {
  message: null,
};

export function LogoutButton() {
  const [state, formAction, isPending] = useActionState(logoutAction, INITIAL_LOGOUT_STATE);

  return (
    <form action={formAction} className={styles.form()}>
      <Button type="submit" variant="outline" className={styles.button()} disabled={isPending}>
        <LogOut aria-hidden="true" />
        {isPending ? 'Saindo...' : 'Sair'}
      </Button>

      {state.message !== null ? (
        <p role="alert" className={styles.feedback()}>
          {state.message}
        </p>
      ) : null}
    </form>
  );
}
