/**
 * appointments/[id]/confirm
 *
 * Generated shape: validate, delegate, respond. All behaviour lives in the
 * module service so it can be unit-tested without an HTTP layer.
 */
import { defineRoute } from '@/server/http/handler';
import { ok } from '@/server/http/response';
import { appointmentService } from '@/server/modules/appointments/appointment.service';

/** IA: 6. Unified Dashboard > New Requests */
export const POST = defineRoute<{ id: string }>({
  access: 'user',
  permissions: ['appointments.confirm'],
  handler: async ({ tx, ctx, params }) =>
    ok(await appointmentService.confirm(tx, ctx, params.id)),
});
