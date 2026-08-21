'use client';

import { Download, FileSpreadsheet, Upload } from 'lucide-react';
import Link from 'next/link';
import { useState } from 'react';

import { importRoutingPassengersAction } from '../actions';
import type { RoutingCompany } from '../domain/routing';
import { Button } from '@/shared/ui/button';
import { Input } from '@/shared/ui/input';
import { Label } from '@/shared/ui/label';

export function PassengerImportPanel({
  companies,
}: {
  readonly companies: readonly RoutingCompany[];
}) {
  const [routingCompanyId, setRoutingCompanyId] = useState(
    companies.length === 1 ? companies[0].id : '',
  );
  const [fileName, setFileName] = useState('');
  const templateHref = routingCompanyId
    ? `/routing/passengers/template?routingCompanyId=${encodeURIComponent(routingCompanyId)}`
    : '#';

  return (
    <div className="space-y-5">
      <div className="space-y-2">
        <Label htmlFor="passenger-client">Cliente dos colaboradores</Label>
        <select
          id="passenger-client"
          value={routingCompanyId}
          onChange={(event) => setRoutingCompanyId(event.target.value)}
          className="h-10 w-full rounded-md border bg-background px-3 text-sm"
          required
        >
          <option value="">Selecione o cliente</option>
          {companies.map((company) => (
            <option key={company.id} value={company.id}>
              {company.tradeName || company.legalName} - {company.taxId}
            </option>
          ))}
        </select>
        <p className="text-xs text-muted-foreground">
          O CNPJ/CPF e vinculado pela aplicacao e nao precisa ser repetido em cada linha.
        </p>
      </div>
      <Button
        render={<Link href={templateHref} aria-disabled={!routingCompanyId} />}
        nativeButton={false}
        variant="outline"
        className={!routingCompanyId ? 'pointer-events-none opacity-50' : ''}
      >
        <Download className="size-4" />
        Baixar modelo XLSX
      </Button>
      <form action={importRoutingPassengersAction} className="space-y-4">
        <input type="hidden" name="routingCompanyId" value={routingCompanyId} />
        <div className="rounded-xl border border-dashed p-4">
          <Label htmlFor="passenger-file" className="flex cursor-pointer items-center gap-3">
            <FileSpreadsheet className="size-6 text-primary" />
            <span>
              <span className="block font-medium">Escolher planilha</span>
              <span className="block text-xs text-muted-foreground">
                XLSX, CSV ou TSV, ate 10 MB
              </span>
            </span>
          </Label>
          <Input
            id="passenger-file"
            name="file"
            type="file"
            accept=".xlsx,.csv,.tsv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,text/csv,text/tab-separated-values"
            className="mt-3"
            onChange={(event) => setFileName(event.target.files?.[0]?.name ?? '')}
            required
          />
          <p className="mt-2 text-sm font-medium" aria-live="polite">
            {fileName ? `Selecionado: ${fileName}` : 'Nenhum arquivo selecionado'}
          </p>
        </div>
        <Button type="submit" disabled={!routingCompanyId || !fileName}>
          <Upload className="size-4" />
          Importar planilha
        </Button>
      </form>
    </div>
  );
}
