'use client';

import { useEffect, useSyncExternalStore } from 'react';
import { Check } from 'lucide-react';
import { Popover } from '@base-ui/react/popover';

import { cn } from '@/shared/lib/utils';

const ACCENT_OPTIONS = [
  { value: 'amber', label: 'Âmbar', color: '#f59e0b' },
  { value: 'copper', label: 'Cobre', color: '#ea580c' },
  { value: 'emerald', label: 'Esmeralda', color: '#10b981' },
  { value: 'teal', label: 'Verde-azulado', color: '#14b8a6' },
  { value: 'rose', label: 'Rosa', color: '#f43f5e' },
] as const;

type AccentColor = (typeof ACCENT_OPTIONS)[number]['value'];
const ACCENT_CHANGE_EVENT = 'lume:accent-color-change';

function storageKey(userId: string): string {
  return `lume:accent-color:${userId}`;
}

function isAccentColor(value: string | null): value is AccentColor {
  return ACCENT_OPTIONS.some((option) => option.value === value);
}

function applyAccent(value: AccentColor) {
  document.documentElement.dataset.accent = value;
}

function readAccent(userId: string): AccentColor {
  if (typeof window === 'undefined') return 'amber';
  const stored = window.localStorage.getItem(storageKey(userId));
  return isAccentColor(stored) ? stored : 'amber';
}

function subscribeToAccentChanges(callback: () => void) {
  window.addEventListener(ACCENT_CHANGE_EVENT, callback);
  window.addEventListener('storage', callback);
  return () => {
    window.removeEventListener(ACCENT_CHANGE_EVENT, callback);
    window.removeEventListener('storage', callback);
  };
}

export function AccentColorPreferenceSync({ userId }: { readonly userId: string }) {
  useEffect(() => {
    const sync = () => applyAccent(readAccent(userId));
    sync();
    const unsubscribe = subscribeToAccentChanges(sync);

    return () => {
      unsubscribe();
      delete document.documentElement.dataset.accent;
    };
  }, [userId]);

  return null;
}

export function AccentColorPicker({ userId }: { readonly userId: string }) {
  const value = useSyncExternalStore(
    subscribeToAccentChanges,
    () => readAccent(userId),
    () => 'amber',
  );

  const select = (next: AccentColor) => {
    window.localStorage.setItem(storageKey(userId), next);
    applyAccent(next);
    window.dispatchEvent(new Event(ACCENT_CHANGE_EVENT));
  };

  const current = ACCENT_OPTIONS.find((option) => option.value === value) ?? ACCENT_OPTIONS[0];

  return (
    <Popover.Root>
      <Popover.Trigger
        className="relative size-7 rounded-full border-2 border-background shadow-sm outline-none ring-1 ring-border transition-transform hover:scale-105 focus-visible:ring-2 focus-visible:ring-ring"
        style={{ backgroundColor: current.color }}
        aria-label={`Cor de destaque: ${current.label}. Alterar cor`}
      />
      <Popover.Portal>
        <Popover.Positioner side="right" align="end" sideOffset={10} className="z-50">
          <Popover.Popup className="w-64 rounded-xl border bg-popover p-3 text-popover-foreground shadow-lg outline-none data-open:animate-in data-open:fade-in-0 data-open:zoom-in-95">
            <Popover.Title className="font-semibold">Cor de destaque</Popover.Title>
            <Popover.Description className="mt-1 text-xs text-muted-foreground">
              Escolha a cor usada em botões, links e itens ativos.
            </Popover.Description>
            <div
              className="mt-3 grid grid-cols-5 gap-2"
              role="radiogroup"
              aria-label="Cores disponíveis"
            >
              {ACCENT_OPTIONS.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  role="radio"
                  aria-checked={value === option.value}
                  aria-label={option.label}
                  title={option.label}
                  onClick={() => select(option.value)}
                  className={cn(
                    'flex size-9 items-center justify-center rounded-full border-2 border-popover shadow-sm outline-none transition-transform hover:scale-105 focus-visible:ring-2 focus-visible:ring-ring',
                    value === option.value && 'ring-2 ring-foreground/60',
                  )}
                  style={{ backgroundColor: option.color }}
                >
                  {value === option.value ? (
                    <Check className="size-4 text-white drop-shadow-sm" aria-hidden="true" />
                  ) : null}
                </button>
              ))}
            </div>
          </Popover.Popup>
        </Popover.Positioner>
      </Popover.Portal>
    </Popover.Root>
  );
}
