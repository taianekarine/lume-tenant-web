'use client';

import { useEffect, useState } from 'react';

import { Input } from '@/shared/ui/input';
import { Label } from '@/shared/ui/label';

import {
  formatPostalCode,
  PostalCodeLookupError,
  postalCodeDigits,
} from '../domain/postal-code-address';
import { lookupPostalCodeAddress } from '../infrastructure/postal-code-address-client';

interface AddressFormState {
  readonly label: string;
  readonly street: string;
  readonly number: string;
  readonly district: string;
  readonly postalCode: string;
  readonly city: string;
  readonly state: string;
  readonly complement: string;
}

const emptyAddress: AddressFormState = {
  label: '',
  street: '',
  number: '',
  district: '',
  postalCode: '',
  city: '',
  state: '',
  complement: '',
};

type LookupState =
  | { readonly status: 'idle' | 'loading' }
  | { readonly status: 'success'; readonly message: string }
  | { readonly status: 'error'; readonly message: string };

export function PostalCodeAddressFields({
  prefix,
  title,
}: {
  readonly prefix: string;
  readonly title: string;
}) {
  const [address, setAddress] = useState<AddressFormState>(emptyAddress);
  const [lookup, setLookup] = useState<LookupState>({ status: 'idle' });
  const digits = postalCodeDigits(address.postalCode);

  useEffect(() => {
    if (digits.length !== 8) return;

    const controller = new AbortController();
    const timeoutId = window.setTimeout(() => {
      setLookup({ status: 'loading' });
      void lookupPostalCodeAddress(digits, controller.signal)
        .then((result) => {
          setAddress((current) => {
            if (postalCodeDigits(current.postalCode) !== digits) return current;
            return {
              ...current,
              postalCode: result.postalCode,
              street: result.street,
              district: result.district,
              city: result.city,
              state: result.state,
              complement: current.complement || result.complement,
            };
          });
          setLookup({
            status: 'success',
            message: 'Endereço preenchido. Confira o número e o complemento.',
          });
        })
        .catch((error: unknown) => {
          if (error instanceof DOMException && error.name === 'AbortError') return;
          const message =
            error instanceof PostalCodeLookupError
              ? error.message
              : 'Não foi possível consultar o CEP. Preencha o endereço manualmente.';
          if (error instanceof PostalCodeLookupError && error.reason === 'not-found') {
            setAddress((current) => ({
              ...current,
              street: '',
              district: '',
              city: '',
              state: '',
            }));
          }
          setLookup({ status: 'error', message });
        });
    }, 300);

    return () => {
      window.clearTimeout(timeoutId);
      controller.abort();
    };
  }, [digits]);

  const update = (field: keyof AddressFormState, value: string) => {
    setAddress((current) => ({ ...current, [field]: value }));
  };
  const updatePostalCode = (value: string) => {
    setLookup({ status: 'idle' });
    update('postalCode', formatPostalCode(value));
  };
  const statusId = `${prefix}-postal-code-status`;

  return (
    <fieldset className="grid gap-3 rounded-lg border p-4 sm:grid-cols-2 lg:grid-cols-4">
      <legend className="px-2 text-sm font-semibold">{title}</legend>
      <div className="space-y-1 lg:col-span-2">
        <Label htmlFor={`${prefix}-label`}>Nome do ponto</Label>
        <Input
          id={`${prefix}-label`}
          name={`${prefix}Label`}
          value={address.label}
          onChange={(event) => update('label', event.target.value)}
          required
        />
      </div>
      <div className="space-y-1">
        <Label htmlFor={`${prefix}-postal-code`}>CEP</Label>
        <Input
          id={`${prefix}-postal-code`}
          name={`${prefix}PostalCode`}
          value={address.postalCode}
          onChange={(event) => updatePostalCode(event.target.value)}
          inputMode="numeric"
          autoComplete="postal-code"
          maxLength={9}
          aria-describedby={statusId}
          required
        />
      </div>
      <div className="space-y-1 lg:col-span-2">
        <Label htmlFor={`${prefix}-street`}>Logradouro</Label>
        <Input
          id={`${prefix}-street`}
          name={`${prefix}Street`}
          value={address.street}
          onChange={(event) => update('street', event.target.value)}
          required
        />
      </div>
      <div className="space-y-1">
        <Label htmlFor={`${prefix}-number`}>Número</Label>
        <Input
          id={`${prefix}-number`}
          name={`${prefix}Number`}
          value={address.number}
          onChange={(event) => update('number', event.target.value)}
          required
        />
      </div>
      <div className="space-y-1">
        <Label htmlFor={`${prefix}-district`}>Bairro</Label>
        <Input
          id={`${prefix}-district`}
          name={`${prefix}District`}
          value={address.district}
          onChange={(event) => update('district', event.target.value)}
          required
        />
      </div>
      <div className="space-y-1">
        <Label htmlFor={`${prefix}-city`}>Cidade</Label>
        <Input
          id={`${prefix}-city`}
          name={`${prefix}City`}
          value={address.city}
          onChange={(event) => update('city', event.target.value)}
          required
        />
      </div>
      <div className="space-y-1">
        <Label htmlFor={`${prefix}-state`}>UF</Label>
        <Input
          id={`${prefix}-state`}
          name={`${prefix}State`}
          value={address.state}
          onChange={(event) => update('state', event.target.value.toUpperCase())}
          maxLength={2}
          required
        />
      </div>
      <div className="space-y-1 sm:col-span-2 lg:col-span-3">
        <Label htmlFor={`${prefix}-complement`}>Complemento</Label>
        <Input
          id={`${prefix}-complement`}
          name={`${prefix}Complement`}
          value={address.complement}
          onChange={(event) => update('complement', event.target.value)}
        />
      </div>
      <p
        id={statusId}
        className={`text-xs sm:col-span-2 lg:col-span-4 ${
          lookup.status === 'error' ? 'text-destructive' : 'text-muted-foreground'
        }`}
        role={lookup.status === 'error' ? 'alert' : 'status'}
      >
        {lookup.status === 'loading'
          ? 'Consultando CEP...'
          : lookup.status === 'success' || lookup.status === 'error'
            ? lookup.message
            : 'Informe os oito dígitos do CEP para preencher o endereço automaticamente.'}
      </p>
    </fieldset>
  );
}
