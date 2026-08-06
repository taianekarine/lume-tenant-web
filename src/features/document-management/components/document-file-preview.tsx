'use client';

import { useState } from 'react';

import { Button } from '@/shared/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/shared/ui/dialog';

export function DocumentFilePreview({
  fileId,
  fileName,
  side,
}: {
  readonly fileId: string;
  readonly fileName: string;
  readonly side: string;
}) {
  const [open, setOpen] = useState(false);
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <Button type="button" variant="outline" size="sm" onClick={() => setOpen(true)}>
        {fileName} · {side}
      </Button>
      <DialogContent className="h-[96dvh] w-[96vw] max-w-none grid-rows-[auto_1fr] overflow-hidden p-0 sm:max-w-[96vw] lg:max-w-[min(96vw,100rem)]">
        <DialogHeader className="border-b p-4 pr-12">
          <DialogTitle>{fileName}</DialogTitle>
          <DialogDescription>Visualização segura do arquivo enviado.</DialogDescription>
        </DialogHeader>
        <iframe
          title={`Arquivo ${fileName}`}
          src={`/documents/files/${fileId}`}
          className="h-full min-h-0 w-full overflow-hidden rounded-b-xl border-0 bg-background"
        />
      </DialogContent>
    </Dialog>
  );
}
