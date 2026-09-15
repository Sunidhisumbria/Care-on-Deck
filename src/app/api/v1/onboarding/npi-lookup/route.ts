/**
 * onboarding/npi-lookup?npi=
 *
 * IA: 4. Provider Onboarding > NPI Lookup (NPPES).
 *
 * `account` rather than `optional`. The registry itself is public, but it is
 * rate limited, and an open proxy to it would spend that allowance for anyone
 * who found the URL rather than for applicants.
 *
 * Read-only: it answers "what does the registry hold for this number". Saving
 * an NPI to an application goes through the `npi_lookup` step, which also
 * checks nobody else has claimed it.
 */
import { defineRoute } from '@/server/http/handler';
import { ok } from '@/server/http/response';
import { npiLookupQuerySchema } from '@/server/modules/onboarding/onboarding.schemas';
import { onboardingService } from '@/server/modules/onboarding/onboarding.service';

export const GET = defineRoute({
  access: 'account',
  query: npiLookupQuerySchema,
  handler: async ({ tx, ctx, query }) => ok(await onboardingService.lookupNpi(tx, ctx, query)),
});
