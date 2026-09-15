import type { UsageMeter } from './usage';

/**
 * Shared shape for every adapter.
 *
 * `isConfigured` lets a caller degrade gracefully rather than fail: the Direct
 * install screen hides the SMS toggle when Telnyx is off, instead of offering a
 * button that throws.
 */
export interface Adapter {
  readonly vendor: string;
  /** The meter this vendor bills against, or null when it is not metered. */
  readonly meter: UsageMeter | null;
  isConfigured(): boolean;
}

export interface AddressComponents {
  line1: string | null;
  line2: string | null;
  city: string | null;
  state: string | null;
  postalCode: string | null;
  countryCode: string;
}

export interface GeoPoint {
  latitude: number;
  longitude: number;
}

/** Permission for a browser to upload one file directly to the store. */
export interface DirectUpload {
  /** Where the browser POSTs the file, as multipart form data. */
  url: string;
  /** Form fields to send with the file, exactly as given. */
  fields: Record<string, string>;
  expiresAt: string;
}

/** What the store says it holds -- the only account of a file that is trusted. */
export interface StoredFile {
  key: string;
  bytes: number;
  format: string;
  width: number | null;
  height: number | null;
}

/**
 * Private file storage. The browser uploads straight to the store with a
 * signed permission; the server signs, inspects and issues expiring links, and
 * never handles the file itself.
 */
export interface FileStorageAdapter extends Adapter {
  createUpload(input: { key: string; formats: readonly string[] }): DirectUpload;
  inspect(key: string): Promise<StoredFile | null>;
  viewUrl(input: { key: string; format: string; expiresInSeconds: number }): string;
  remove(key: string): Promise<void>;
}
