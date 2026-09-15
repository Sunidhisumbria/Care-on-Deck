import { z } from 'zod';

/**
 * Fail fast on boot rather than at the first request that needs a missing key.
 * Integration keys are optional so local dev can run with adapters disabled --
 * each adapter checks its own config and throws IntegrationNotConfigured.
 */
const schema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  APP_ENV: z.enum(['local', 'staging', 'production']).default('local'),
  APP_URL: z.string().url(),

  /*
   * Browser-visible. Declared here so a missing one fails at boot rather than
   * silently reaching the client as `undefined`, and so there is one list of
   * what the frontend is allowed to see. Next.js inlines these at build time,
   * which is why they must be read as full `process.env.NEXT_PUBLIC_X`
   * expressions in client code -- see src/lib/public-env.ts.
   */
  NEXT_PUBLIC_APP_URL: z.string().url().optional(),
  NEXT_PUBLIC_GOOGLE_MAPS_BROWSER_KEY: z.string().optional(),
  NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: z.string().optional(),
  NEXT_PUBLIC_FIREBASE_API_KEY: z.string().optional(),
  NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN: z.string().optional(),
  NEXT_PUBLIC_FIREBASE_PROJECT_ID: z.string().optional(),
  NEXT_PUBLIC_FIREBASE_APP_ID: z.string().optional(),
  NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID: z.string().optional(),
  NEXT_PUBLIC_FIREBASE_VAPID_KEY: z.string().optional(),

  DATABASE_URL: z.string().url(),
  DATABASE_POOL_MAX: z.coerce.number().int().positive().default(10),

  PHI_ENCRYPTION_KEY: z.string().min(1).optional(),
  SESSION_SECRET: z.string().min(32).optional(),

  FIREBASE_PROJECT_ID: z.string().optional(),
  FIREBASE_CLIENT_EMAIL: z.string().optional(),
  FIREBASE_PRIVATE_KEY: z.string().optional(),

  STRIPE_SECRET_KEY: z.string().optional(),
  STRIPE_WEBHOOK_SECRET: z.string().optional(),

  TYPESENSE_HOST: z.string().optional(),
  TYPESENSE_PORT: z.coerce.number().int().default(443),
  TYPESENSE_PROTOCOL: z.enum(['http', 'https']).default('https'),
  TYPESENSE_API_KEY: z.string().optional(),

  TELNYX_API_KEY: z.string().optional(),
  TELNYX_MESSAGING_PROFILE_ID: z.string().optional(),
  TELNYX_FROM_NUMBER: z.string().optional(),
  TELNYX_WEBHOOK_PUBLIC_KEY: z.string().optional(),

  POSTMARK_SERVER_TOKEN: z.string().optional(),
  POSTMARK_FROM_EMAIL: z.string().email().optional(),
  AWS_REGION: z.string().default('us-east-1'),
  AWS_ACCESS_KEY_ID: z.string().optional(),
  AWS_SECRET_ACCESS_KEY: z.string().optional(),
  SES_FROM_EMAIL: z.string().email().optional(),

  REKOGNITION_MIN_CONFIDENCE: z.coerce.number().min(0).max(100).default(80),

  S3_BUCKET: z.string().optional(),
  S3_PUBLIC_BASE_URL: z.string().url().optional(),

  /*
   * Interim file storage until the AWS account is connected. Provider documents
   * only -- never patient data, which needs a BAA this plan does not offer.
   */
  CLOUDINARY_CLOUD_NAME: z.string().optional(),
  CLOUDINARY_API_KEY: z.string().optional(),
  CLOUDINARY_API_SECRET: z.string().optional(),

  GOOGLE_MAPS_SERVER_KEY: z.string().optional(),
  NPPES_BASE_URL: z.string().url().default('https://npiregistry.cms.hhs.gov/api'),
  OPENDENTAL_BASE_URL: z.string().url().optional(),

  LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace']).default('info'),
  INTERNAL_JOB_SECRET: z.string().optional(),
});

/**
 * `.env` keys left blank arrive as empty strings, not as absent. Without this
 * an unfilled optional line ("POSTMARK_FROM_EMAIL=") fails validation as an
 * invalid email and takes the whole server down -- which is exactly what
 * copying .env.example produces. Blank means "not set".
 */
const present = Object.fromEntries(
  Object.entries(process.env).filter(([, value]) => value !== undefined && value !== ''),
);

const parsed = schema.safeParse(present);

if (!parsed.success) {
  const issues = parsed.error.issues.map((i) => `  - ${i.path.join('.')}: ${i.message}`).join('\n');
  throw new Error(`Invalid environment configuration:\n${issues}`);
}

export const env = parsed.data;
export type Env = typeof env;

export const isProduction = env.APP_ENV === 'production';
