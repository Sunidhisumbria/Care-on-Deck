import { apiGet, apiPost } from '@/lib/http/client';

import type { UploadedFile, UploadPurpose, UploadTicket } from '../types';

/** The upload endpoints. The file itself goes to the store, not through these. */
export const uploadsApi = {
  create: (body: { purpose: UploadPurpose; content_type: string; byte_size: number }) =>
    apiPost<UploadTicket>('/uploads', body),

  complete: (body: { purpose: UploadPurpose; key: string }) => apiPost<UploadedFile>('/uploads/complete', body),

  viewLink: (mediaId: string) =>
    apiGet<{ url: string; expires_at: string }>(`/uploads/${encodeURIComponent(mediaId)}/view`),
};
