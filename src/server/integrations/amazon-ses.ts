import { env } from '@/server/config/env';
import { IntegrationNotConfiguredError } from '@/server/http/errors';

import type { EmailMessage } from './postmark';
import type { Adapter } from './types';

/**
 * IA: 15. External Services > Communications > Amazon SES.
 *
 * The bulk and fallback sender: platform announcements, report-ready notices,
 * and anything Postmark rejects or rate-limits. It shares `EmailMessage` with
 * the Postmark adapter deliberately, so the mailer can fail over without
 * reshaping the payload.
 */
export interface AmazonSesAdapter extends Adapter {
  send(message: EmailMessage): Promise<{ messageId: string }>;
}

export const amazonSes: AmazonSesAdapter = {
  vendor: 'amazon_ses',
  meter: 'email',

  isConfigured() {
    return Boolean(env.AWS_ACCESS_KEY_ID && env.AWS_SECRET_ACCESS_KEY && env.SES_FROM_EMAIL);
  },

  async send() {
    if (!this.isConfigured()) throw new IntegrationNotConfiguredError('Amazon SES');
    throw new Error('amazonSes.send is not implemented yet.');
  },
};
