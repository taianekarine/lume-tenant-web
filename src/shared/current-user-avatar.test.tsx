import { act, render, screen, waitFor } from '@testing-library/react';

import {
  CurrentUserAvatar,
  CurrentUserProfilePictureProvider,
  publishCurrentUserProfilePicture,
  useCurrentUserProfilePicture,
} from './current-user-avatar';

const originalFetch = global.fetch;

function PictureProbe() {
  return <output aria-label="Foto atual">{useCurrentUserProfilePicture() ?? 'sem foto'}</output>;
}

describe('CurrentUserAvatar', () => {
  beforeEach(() => {
    window.localStorage.clear();
    global.fetch = jest.fn().mockResolvedValue({
      ok: false,
      json: jest.fn().mockResolvedValue({}),
    } as unknown as Response);
  });

  afterEach(() => {
    global.fetch = originalFetch;
    jest.clearAllMocks();
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

  it('carrega do servidor a foto usada em todas as partes da aplicaÃ§Ã£o', async () => {
    jest.mocked(global.fetch).mockResolvedValue({
      ok: true,
      json: jest.fn().mockResolvedValue({
        profilePictureDataUrl: 'data:image/png;base64,SERVER',
      }),
    } as unknown as Response);

    render(
      <CurrentUserProfilePictureProvider userId="user-001">
        <CurrentUserAvatar name="Taiane Karine" />
        <PictureProbe />
      </CurrentUserProfilePictureProvider>,
    );

    await waitFor(() =>
      expect(screen.getByLabelText('Foto atual')).toHaveTextContent('data:image/png;base64,SERVER'),
    );
    expect(global.fetch).toHaveBeenCalledWith('/api/current-user/profile-picture', {
      cache: 'no-store',
    });
    expect(window.localStorage.getItem('lume:profile-picture:user-001')).toBe(
      'data:image/png;base64,SERVER',
    );
  });
});
