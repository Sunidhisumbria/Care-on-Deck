import { env } from '@/server/config/env';
import { ApiError, IntegrationNotConfiguredError } from '@/server/http/errors';

import type { Adapter } from './types';


export interface NpiTaxonomy {
  code: string;
  desc: string;
  primary: boolean;
  state: string | null;
  license: string | null;
}

export interface NpiRecord {
  npi: string;
  enumerationType: 'NPI-1' | 'NPI-2';
  firstName: string | null;
  middleName: string | null;
  lastName: string | null;
  otherNames: Array<{ firstName: string | null; lastName: string | null }>;
  organizationName: string | null;
  credential: string | null;
  gender: string | null;
  status: string;
  enumerationDate: string | null;
  taxonomies: NpiTaxonomy[];
  addresses: Array<{
    purpose: string;
    line1: string;
    line2: string | null;
    city: string;
    state: string;
    postalCode: string;
    phone: string | null;
  }>;
  raw: Record<string, unknown>;
}

export interface NppesAdapter extends Adapter {
  lookupByNpi(npi: string): Promise<NpiRecord | null>;
  search(input: {
    firstName?: string;
    lastName?: string;
    state?: string;
    postalCode?: string;
    limit?: number;
  }): Promise<NpiRecord[]>;
}

const TIMEOUT_MS = 8000;

export const nppes: NppesAdapter = {
  vendor: 'nppes',
  meter: null,

  isConfigured() {
    return Boolean(env.NPPES_BASE_URL);
  },


  async lookupByNpi(npi) {
    if (!this.isConfigured()) throw new IntegrationNotConfiguredError('NPPES');

    const url = new URL(`${env.NPPES_BASE_URL.replace(/\/+$/, '')}/`);
    url.searchParams.set('version', '2.1');
    url.searchParams.set('number', npi);

    let response: Response;
    try {
      response = await fetch(url, {
        headers: { accept: 'application/json' },
        signal: AbortSignal.timeout(TIMEOUT_MS),
        cache: 'no-store',
      });
    } catch {
      throw registryUnavailable();
    }
    if (!response.ok) throw registryUnavailable();

    const payload = (await response.json().catch(() => null)) as NppesPayload | null;
    if (!payload) throw registryUnavailable();

   
    if (payload.Errors && payload.Errors.length > 0) return null;

    const result = payload.results?.[0];
    return result ? normalise(result) : null;
  },

  async search() {
    throw new Error('nppes.search is not implemented yet.');
  },
};

interface NppesPayload {
  result_count?: number;
  results?: NppesResult[];
  Errors?: Array<{ description?: string }>;
}

interface NppesResult {
  number: string;
  enumeration_type: 'NPI-1' | 'NPI-2';
  basic?: {
    first_name?: string;
    middle_name?: string;
    last_name?: string;
    organization_name?: string;
    credential?: string;
    sex?: string;
    gender?: string;
    status?: string;
    enumeration_date?: string;
  };
  other_names?: Array<{ first_name?: string; last_name?: string }>;
  taxonomies?: Array<{ code: string; desc: string; primary?: boolean; state?: string | null; license?: string | null }>;
  addresses?: Array<{
    address_purpose?: string;
    address_1?: string;
    address_2?: string;
    city?: string;
    state?: string;
    postal_code?: string;
    telephone_number?: string;
  }>;
}

function registryUnavailable(): ApiError {
  return new ApiError(
    'INTEGRATION_UNAVAILABLE',
    'The national NPI registry is not responding. Please try again in a few minutes.',
  );
}

function normalise(result: NppesResult): NpiRecord {
  const basic = result.basic ?? {};

  return {
    npi: result.number,
    enumerationType: result.enumeration_type,
    firstName: properCase(basic.first_name),
    middleName: properCase(basic.middle_name),
    lastName: properCase(basic.last_name),
    otherNames: (result.other_names ?? [])
      .filter((other) => other.first_name || other.last_name)
      .map((other) => ({ firstName: properCase(other.first_name), lastName: properCase(other.last_name) })),
    organizationName: text(basic.organization_name),
    credential: text(basic.credential),
    gender: text(basic.sex ?? basic.gender),
    status: basic.status ?? '',
    enumerationDate: text(basic.enumeration_date),
    taxonomies: (result.taxonomies ?? []).map((taxonomy) => ({
      code: taxonomy.code,
      desc: taxonomy.desc,
      primary: Boolean(taxonomy.primary),
      state: text(taxonomy.state),
      license: text(taxonomy.license),
    })),
    addresses: (result.addresses ?? []).map((address) => ({
      purpose: address.address_purpose ?? '',
      line1: properCase(address.address_1) ?? '',
      line2: properCase(address.address_2),
      city: properCase(address.city) ?? '',
      state: (address.state ?? '').toUpperCase(),
      postalCode: zip(address.postal_code),
      phone: text(address.telephone_number),
    })),
    raw: result as unknown as Record<string, unknown>,
  };
}

function text(value: string | null | undefined): string | null {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

/** The registry stores names and addresses in capitals. */
function properCase(value: string | null | undefined): string | null {
  const trimmed = text(value);
  if (!trimmed) return null;
  return trimmed
    .toLowerCase()
    .replace(/(^|[\s\-'.])([a-z])/g, (_match, separator: string, letter: string) => separator + letter.toUpperCase());
}

/** "117903213" -> "11790-3213". */
function zip(value: string | undefined): string {
  const digits = (value ?? '').replace(/\D/g, '');
  return digits.length === 9 ? `${digits.slice(0, 5)}-${digits.slice(5)}` : digits;
}
