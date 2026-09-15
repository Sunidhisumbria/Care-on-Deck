/**
 * appointments/[id]/no-show
 *
 * Generated shape: validate, delegate, respond. All behaviour lives in the
 * module service so it can be unit-tested without an HTTP layer.
 */
import { defineRoute } from '@/server/http/handler';
import { ok } from '@/server/http/response';
import { appointmentService } from '@/server/modules/appointments/appointment.service';

/** IA: 6. Unified Dashboard > No-Shows */
export const POST = defineRoute<{ id: string }>({
  access: 'user',
  permissions: ['appointments.mark_no_show'],
  handler: async ({ tx, ctx, params }) =>
    ok(await appointmentService.markNoShow(tx, ctx, params.id)),
});
