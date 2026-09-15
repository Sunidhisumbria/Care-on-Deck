import { createRequire } from 'node:module';

import pino, { type LoggerOptions } from 'pino';

import { env } from '@/server/config/env';

/**
 * Structured logging with PHI redaction built in.
 *
 * The redaction list is deliberately broad: it is far cheaper to lose a field
 * from a log line than to discover patient names sitting in a log aggregator.
 * Add to it whenever a new PHI-bearing field appears in a logged object.
 */
const options: LoggerOptions = {
  level: env.LOG_LEVEL,
  redact: {
    paths: [
      'req.headers.authorization',
      'req.headers.cookie',
      '*.password',
      '*.token',
      '*.secret',
      '*.apiKey',
      '*.memberId',
      '*.memberIdEncrypted',
      '*.dateOfBirth',
      '*.dob',
      '*.ssn',
      '*.patientSnapshot',
      'patient.firstName',
      'patient.lastName',
      'patient.email',
      'patient.phone',
    ],
    censor: '[redacted]',
  },
  base: { app: 'careondeck', env: env.APP_ENV },
};

/**
 * Pretty output in development, but only if the transport is actually
 * installed. pino resolves transports at startup and throws if one is
 * missing, which would take the whole server down over a cosmetic choice --
 * so probe for it and fall back to plain JSON lines.
 */
function prettyTransport(): LoggerOptions['transport'] {
  if (env.NODE_ENV !== 'development') return undefined;
  try {
    createRequire(import.meta.url).resolve('pino-pretty');
    return { target: 'pino-pretty', options: { colorize: true, translateTime: 'HH:MM:ss' } };
  } catch {
    return undefined;
  }
}

export const logger = pino({ ...options, transport: prettyTransport() });

export type Logger = typeof logger;

/** A child logger bound to one request, so every line carries the same id. */
export function requestLogger(requestId: string, extra?: Record<string, unknown>) {
  return logger.child({ requestId, ...extra });
}
