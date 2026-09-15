import { IntegrationNotConfiguredError } from '@/server/http/errors';

import type { Adapter } from './types';

/**
 * IA: 15. External Services > Integrations > OpenDental.
 *
 * Per-facility, not per-platform: credentials live encrypted on
 * `integration_connections` and are decrypted only for the duration of a call.
 * Every method therefore takes a connection id rather than reading global env.
 *
 * Sync direction matters. We PUSH appointments booked on CareOndeck into the
 * practice system, and PULL their existing schedule so we never offer a slot
 * that is already taken in the chair. Conflicts resolve in favour of
 * OpenDental -- it is the practice's system of record, not ours.
 */
export interface OpenDentalAppointment {
  externalId: string;
  externalPatientId: string;
  providerExternalId: string | null;
  /** ISO-8601 in the practice's local timezone, as OpenDental reports it. */
  startsAt: string;
  endsAt: string;
  status: string;
  note: string | null;
}

export interface OpenDentalAdapter extends Adapter {
  testConnection(connectionId: string): Promise<{ ok: boolean; message: string }>;

  pullAppointments(input: {
    connectionId: string;
    from: Date;
    to: Date;
  }): Promise<OpenDentalAppointment[]>;

  pushAppointment(input: {
    connectionId: string;
    appointmentId: string;
  }): Promise<{ externalId: string }>;

  /** Matches on name plus date of birth before creating, to avoid duplicate charts. */
  findOrCreatePatient(input: {
    connectionId: string;
    patientId: string;
  }): Promise<{ externalPatientId: string }>;
}

export const openDental: OpenDentalAdapter = {
  vendor: 'opendental',
  meter: null,

  isConfigured() {
    // Configuration is per connection, so the global answer is always true;
    // each method validates its own connection row instead.
    return true;
  },

  async testConnection() {
    throw new IntegrationNotConfiguredError('OpenDental');
  },

  async pullAppointments() {
    throw new Error('openDental.pullAppointments is not implemented yet.');
  },

  async pushAppointment() {
    throw new Error('openDental.pushAppointment is not implemented yet.');
  },

  async findOrCreatePatient() {
    throw new Error('openDental.findOrCreatePatient is not implemented yet.');
  },
};
