import { z } from 'zod';

/**
 * What each kind of upload accepts, shared by the file picker and the server.
 *
 * The picker uses these to refuse a wrong file before anything is sent. The
 * server applies them again to what the store says actually arrived -- the
 * browser's claim about a file's type is a hint, not evidence.
 */

export const FILE_FORMATS = {
  pdf: { contentType: 'application/pdf', extensions: ['pdf'] },
  jpg: { contentType: 'image/jpeg', extensions: ['jpg', 'jpeg'] },
  png: { contentType: 'image/png', extensions: ['png'] },
} as const;

export type FileFormat = keyof typeof FILE_FORMATS;

const MB = 1024 * 1024;

export const UPLOAD_PURPOSES = {
  license_document: { label: 'License Document', formats: ['pdf', 'jpg', 'png'], maxBytes: 10 * MB },
  /** A photo, not a document: images only, and smaller. */
  provider_headshot: { label: 'Profile Photo', formats: ['jpg', 'png'], maxBytes: 5 * MB },
  certificate: { label: 'Certificate', formats: ['pdf', 'jpg', 'png'], maxBytes: 10 * MB },
  /** A patient's own avatar. Seen by nobody but them. */
  patient_photo: { label: 'Profile Photo', formats: ['jpg', 'png'], maxBytes: 5 * MB },
  /** A photo of the front of a patient's insurance card. */
  insurance_card: { label: 'Insurance Card', formats: ['jpg', 'png'], maxBytes: 10 * MB },
} as const satisfies Record<string, { label: string; formats: readonly FileFormat[]; maxBytes: number }>;

export type UploadPurpose = keyof typeof UPLOAD_PURPOSES;

export const uploadPurposeSchema = z.enum([
  'license_document',
  'provider_headshot',
  'certificate',
  'patient_photo',
  'insurance_card',
]);

const FORMATS = Object.keys(FILE_FORMATS) as FileFormat[];

/** By declared type first, then by extension -- some systems send PDFs as octet-stream. */
export function formatFromFile(file: { name: string; type: string }): FileFormat | null {
  const byType = formatFromContentType(file.type);
  if (byType) return byType;
  const extension = file.name.split('.').pop()?.toLowerCase() ?? '';
  return FORMATS.find((format) => (FILE_FORMATS[format].extensions as readonly string[]).includes(extension)) ?? null;
}

export function formatFromContentType(contentType: string): FileFormat | null {
  return FORMATS.find((format) => FILE_FORMATS[format].contentType === contentType) ?? null;
}

export function isAllowedFormat(purpose: UploadPurpose, format: FileFormat | null): format is FileFormat {
  return format !== null && (UPLOAD_PURPOSES[purpose].formats as readonly FileFormat[]).includes(format);
}

/** For `<input accept>`: both extensions and types, because browsers disagree on which they honour. */
export function acceptAttribute(purpose: UploadPurpose): string {
  const formats = UPLOAD_PURPOSES[purpose].formats as readonly FileFormat[];
  return [
    ...formats.flatMap((format) => FILE_FORMATS[format].extensions.map((extension) => `.${extension}`)),
    ...formats.map((format) => FILE_FORMATS[format].contentType),
  ].join(',');
}

/** ["pdf", "jpg", "png"] -> "PDF, JPG or PNG". */
export function formatList(formats: readonly FileFormat[]): string {
  const names = formats.map((format) => format.toUpperCase());
  return names.length > 1 ? `${names.slice(0, -1).join(', ')} or ${names[names.length - 1]}` : (names[0] ?? '');
}

/** "PDF, JPG, PNG · 10 MB", as the designs word it. */
export function formatsHint(purpose: UploadPurpose): string {
  const rules = UPLOAD_PURPOSES[purpose];
  return `${rules.formats.map((format) => format.toUpperCase()).join(', ')} · ${formatBytes(rules.maxBytes)}`;
}

export function formatBytes(bytes: number): string {
  if (bytes >= MB) return `${Math.round((bytes / MB) * 10) / 10} MB`.replace('.0 ', ' ');
  if (bytes >= 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${bytes} B`;
}
