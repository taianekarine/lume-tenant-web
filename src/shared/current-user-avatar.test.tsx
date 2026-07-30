import { act, render, screen, waitFor } from '@testing-library/react';

import {
  CurrentUserAvatar,
  CurrentUserProfilePictureProvider,
  publishCurrentUserProfilePicture,
  useCurrentUserProfilePicture,
} from './current-user-avatar';

function PictureProbe() {
  return <output aria-label="Foto atual">{useCurrentUserProfilePicture() ?? 'sem foto'}</output>;
}

describe('CurrentUserAvatar', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it('atualiza todas as representações do usuário quando a foto do perfil muda', async () => {
    render(
      <CurrentUserProfilePictureProvider userId="user-001">
        <CurrentUserAvatar name="Taiane Karine" />
        <CurrentUserAvatar name="Taiane Karine" imageAlt="Foto no Message" />
        <PictureProbe />
      </CurrentUserProfilePictureProvider>,
    );

    expect(screen.getAllByText('TK')).toHaveLength(2);

    act(() => publishCurrentUserProfilePicture('user-001', 'data:image/png;base64,AQID'));

    await waitFor(() =>
      expect(screen.getByLabelText('Foto atual')).toHaveTextContent('data:image/png;base64,AQID'),
    );
  });

  it('restaura a foto persistida apenas para o usuário autenticado', async () => {
    window.localStorage.setItem('lume:profile-picture:user-001', 'data:image/webp;base64,AQID');

    render(
      <CurrentUserProfilePictureProvider userId="user-001">
        <CurrentUserAvatar name="Taiane Karine" />
        <PictureProbe />
      </CurrentUserProfilePictureProvider>,
    );

    await waitFor(() =>
      expect(screen.getByLabelText('Foto atual')).toHaveTextContent('data:image/webp;base64,AQID'),
    );
  });
});
