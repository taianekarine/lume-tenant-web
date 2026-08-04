import type {
  DocumentChecklistSummary,
  DocumentRequestContext,
  DocumentRequestDetail,
  DocumentRequestList,
  DocumentRequestStatus,
} from '../domain';

export type DocumentManagementErrorCode =
  | 'unauthorized'
  | 'forbidden'
  | 'validation'
  | 'conflict'
  | 'not-found'
  | 'invalid-response'
  | 'service-unavailable';

export class DocumentManagementError extends Error {
  constructor(
    readonly code: DocumentManagementErrorCode,
    message: string,
    readonly publicCode = code.toUpperCase().replaceAll('-', '_'),
  ) {
    super(message);
    this.name = 'DocumentManagementError';
  }
}

export interface DocumentManagementGateway {
  listRequests(query?: {
    page?: number;
    pageSize?: number;
    status?: DocumentRequestStatus;
    context?: DocumentRequestContext;
    subjectUserId?: string;
  }): Promise<DocumentRequestList>;
  getRequest(requestId: string): Promise<DocumentRequestDetail>;
  listChecklists(): Promise<readonly DocumentChecklistSummary[]>;
  createRequest(input: {
    commandId: string;
    subjectUserId: string;
    checklistId: string;
    context: DocumentRequestContext;
    deadline?: string;
    notes?: string;
  }): Promise<DocumentRequestDetail>;
  upload(requestItemId: string, formData: FormData): Promise<DocumentRequestDetail>;
  completeSubmission(submissionId: string): Promise<DocumentRequestDetail>;
  review(
    submissionId: string,
    input: {
      commandId: string;
      decision: 'approved' | 'rejected' | 'resubmission-required';
      reason?: string;
      notes?: string;
      validUntil?: string;
      originalCheckStatus?: 'not-required' | 'pending' | 'confirmed' | 'divergent';
      originalObservation?: string;
    },
  ): Promise<DocumentRequestDetail>;
  getFile(fileId: string): Promise<Response>;
  downloadExport(): Promise<Response>;
}
