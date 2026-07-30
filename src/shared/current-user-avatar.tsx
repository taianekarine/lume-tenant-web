'use client';

import * as React from 'react';

import { cn } from '@/shared/lib/utils';
import { Avatar, AvatarFallback, AvatarImage } from '@/shared/ui/avatar';

const PROFILE_PICTURE_EVENT = 'lume:current-user-profile-picture';
const PROFILE_PICTURE_STORAGE_PREFIX = 'lume:profile-picture:';

interface CurrentUserProfilePictureContextValue {
  readonly userId: string;
  readonly pictureDataUrl: string | null;
}

interface ProfilePictureEventDetail {
  readonly userId: string;
  readonly pictureDataUrl: string | null;
}

const CurrentUserProfilePictureContext =
  React.createContext<CurrentUserProfilePictureContextValue | null>(null);

function storageKey(userId: string): string {
  return `${PROFILE_PICTURE_STORAGE_PREFIX}${userId}`;
}

function readStoredPicture(userId: string): string | null {
  try {
    return window.localStorage.getItem(storageKey(userId));
  } catch {
    return null;
  }
}

function persistPicture(userId: string, pictureDataUrl: string | null): void {
  try {
    if (pictureDataUrl) {
      window.localStorage.setItem(storageKey(userId), pictureDataUrl);
    } else {
      window.localStorage.removeItem(storageKey(userId));
    }
  } catch {
    // A atualização em memória continua funcionando mesmo sem armazenamento local.
  }
}

export function publishCurrentUserProfilePicture(
  userId: string,
  pictureDataUrl: string | null,
): void {
  if (typeof window === 'undefined') return;

  persistPicture(userId, pictureDataUrl);
  window.dispatchEvent(
    new CustomEvent<ProfilePictureEventDetail>(PROFILE_PICTURE_EVENT, {
      detail: { userId, pictureDataUrl },
    }),
  );
}

export function CurrentUserProfilePictureProvider({
  userId,
  children,
}: {
  readonly userId: string;
  readonly children: React.ReactNode;
}) {
  const [pictureDataUrl, setPictureDataUrl] = React.useState<string | null>(null);

  React.useEffect(() => {
    const hydrateId = window.setTimeout(() => setPictureDataUrl(readStoredPicture(userId)), 0);

    const receivePicture = (event: Event) => {
      const detail = (event as CustomEvent<ProfilePictureEventDetail>).detail;
      if (detail?.userId === userId) setPictureDataUrl(detail.pictureDataUrl);
    };

    window.addEventListener(PROFILE_PICTURE_EVENT, receivePicture);
    return () => {
      window.clearTimeout(hydrateId);
      window.removeEventListener(PROFILE_PICTURE_EVENT, receivePicture);
    };
  }, [userId]);

  const value = React.useMemo(() => ({ userId, pictureDataUrl }), [pictureDataUrl, userId]);

  return (
    <CurrentUserProfilePictureContext.Provider value={value}>
      {children}
    </CurrentUserProfilePictureContext.Provider>
  );
}

export function useCurrentUserProfilePicture(): string | null {
  return React.useContext(CurrentUserProfilePictureContext)?.pictureDataUrl ?? null;
}

function getInitials(name: string): string {
  return (
    name
      .trim()
      .split(/\s+/)
      .slice(0, 2)
      .map((part) => part.charAt(0))
      .join('')
      .toLocaleUpperCase('pt-BR') || '?'
  );
}

export function CurrentUserAvatar({
  name,
  imageAlt,
  className,
  imageClassName,
  fallbackClassName,
}: {
  readonly name: string;
  readonly imageAlt?: string;
  readonly className?: string;
  readonly imageClassName?: string;
  readonly fallbackClassName?: string;
}) {
  const pictureDataUrl = useCurrentUserProfilePicture();

  return (
    <Avatar className={className}>
      {pictureDataUrl ? (
        <AvatarImage
          src={pictureDataUrl}
          alt={imageAlt ?? `Foto de ${name}`}
          className={imageClassName}
        />
      ) : null}
      <AvatarFallback className={cn(fallbackClassName)}>{getInitials(name)}</AvatarFallback>
    </Avatar>
  );
}
