import { z } from 'zod';

/**
 * Which insurance a practice accepts, as the Accepted Insurance step and the
 * server both check it.
 *
 * Carriers, not plans, for now: "all Aetna plans" is how most practices answer,
 * and the directory has no plans yet. The table underneath already allows a
 * plan per carrier, so narrowing later is additive.
 *
 * Self-pay only is an explicit answer rather than an empty list, so a practice
 * that forgot this step can never look like one that deliberately accepts no
 * insurance.
 */
export const acceptedInsuranceSchema = z
  .object({
    self_pay_only: z.boolean(),
    carrier_ids: z.array(z.string().uuid('That carrier was not recognised.')).max(100, 'Choose up to 100 carriers.'),
  })
  .strict()
  .superRefine((value, ctx) => {
    if (!value.self_pay_only && value.carrier_ids.length === 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['carrier_ids'],
        message: 'Choose at least one insurance carrier, or select self-pay only.',
      });
    }
    if (value.self_pay_only && value.carrier_ids.length > 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['carrier_ids'],
        message: 'A self-pay only practice does not list insurance carriers.',
      });
    }
    if (new Set(value.carrier_ids).size !== value.carrier_ids.length) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['carrier_ids'], message: 'Each carrier can be chosen once.' });
    }
  });

export type AcceptedInsuranceValues = z.infer<typeof acceptedInsuranceSchema>;
