'use server';

import { randomUUID } from 'node:crypto';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { z } from 'zod';

import { DocumentManagementError } from '../application';
import { executeAuthenticatedDocumentMutation } from '../server';

function value(formData: FormData, name: string): string {
  const entry = formData.get(name);
  return typeof entry === 'string' ? entry.trim() : '';
}

function failure(path: string, error: unknown): never {
  if (error instanceof DocumentManagementError && error.code === 'unauthorized') {
    redirect('/auth/session-expired');
  }
  const message =
    error instanceof DocumentManagementError
      ? `${error.message} Código: ${error.publicCode}`
      : 'Não foi possível concluir a operação documental.';
  redirect(`${path}?error=${encodeURIComponent(message)}`);
}

const createRequestSchema = z.object({
  subjectUserId: z.string().uuid(),
  checklistId: z.string().uuid(),
  context: z.enum([
    'admission',
    'document-update',
    'document-renewal',
    'regularization',
    'offboarding',
    'other',
  ]),
  deadline: z.string().optional(),
  notes: z.string().max(2000).optional(),
});

export async function createDocumentRequestAction(formData: FormData): Promise<void> {
  const parsed = createRequestSchema.safeParse({
    subjectUserId: value(formData, 'subjectUserId'),
    checklistId: value(formData, 'checklistId'),
    context: value(formData, 'context'),
    deadline: value(formData, 'deadline') || undefined,
    notes: value(formData, 'notes') || undefined,
  });
  if (!parsed.success) redirect('/document-management?error=Revise os dados da solicitação.');

  let requestId: string;
  try {
    const request = await executeAuthenticatedDocumentMutation((gateway) =>
      gateway.createRequest({ ...parsed.data, commandId: randomUUID() }),
    );
    requestId = request.id;
  } catch (error) {
    failure('/document-management', error);
  }
  revalidatePath('/document-management');
  revalidatePath('/documents');
  redirect(`/document-management/${requestId}?success=Solicitação criada.`);
}

export async function uploadDocumentSubmissionAction(
  requestId: string,
  requestItemId: string,
  returnPath: string,
  formData: FormData,
): Promise<void> {
  formData.set('commandId', randomUUID());
  try {
    const request = await executeAuthenticatedDocumentMutation((gateway) =>
      gateway.upload(requestItemId, formData),
    );
    const submission = request.items.find((item) => item.id === requestItemId)?.submissions.at(0);
    if (submission) {
      await executeAuthenticatedDocumentMutation((gateway) =>
        gateway.completeSubmission(submission.id),
      );
    }
  } catch (error) {
    failure(returnPath, error);
  }
  revalidatePath(`/documents/${requestId}`);
  revalidatePath(`/document-management/${requestId}`);
  redirect(`${returnPath}?success=Documento enviado para revisão.`);
}

export async function reviewDocumentSubmissionAction(
  requestId: string,
  submissionId: string,
  returnPath: string,
  formData: FormData,
): Promise<void> {
  const decision = value(formData, 'decision');
  if (!['approved', 'rejected', 'resubmission-required'].includes(decision)) {
    redirect(`${returnPath}?error=Decisão inválida.`);
  }
  try {
    await executeAuthenticatedDocumentMutation((gateway) =>
      gateway.review(submissionId, {
        commandId: randomUUID(),
        decision: decision as 'approved' | 'rejected' | 'resubmission-required',
        reason: value(formData, 'reason') || undefined,
        notes: value(formData, 'notes') || undefined,
        validUntil: value(formData, 'validUntil') || undefined,
        originalCheckStatus:
          (value(formData, 'originalCheckStatus') as
            'not-required' | 'pending' | 'confirmed' | 'divergent') || undefined,
        originalObservation: value(formData, 'originalObservation') || undefined,
      }),
    );
  } catch (error) {
    failure(returnPath, error);
  }
  revalidatePath(`/documents/${requestId}`);
  revalidatePath(`/document-management/${requestId}`);
  redirect(`${returnPath}?success=Revisão registrada.`);
}
