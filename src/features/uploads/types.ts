import type { UploadPurpose } from '@/lib/uploads';

export type { UploadPurpose } from '@/lib/uploads';

/** A recorded upload. `file_name` is only known in the session that uploaded it. */
export interface UploadedFile {
  media_id: string;
  purpose: UploadPurpose;
  content_type: string;
  byte_size: number;
  file_name?: string;
}

/** Permission to upload one file: where to send it, and the signed fields to send with it. */
export interface UploadTicket {
  key: string;
  upload: { url: string; fields: Record<string, string>; expires_at: string };
  max_bytes: number;
}
