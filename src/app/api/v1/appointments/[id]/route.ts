/**
 * appointments/[id]
 *
 * Generated shape: validate, delegate, respond. All behaviour lives in the
 * module service so it can be unit-tested without an HTTP layer.
 */
import { defineRoute } from '@/server/http/handler';
import { ok } from '@/server/http/response';
import { appointmentService } from '@/server/modules/appointments/appointment.service';

/** Returns PHI, so it writes a phi_access_logs row. */
export const GET = defineRoute<{ id: string }>({
  access: 'user',
  permissions: ['appointments.read'],
  handler: async ({ tx, ctx, params }) =>
    ok(await appointmentService.get(tx, ctx, params.id)),
});

export const PATCH = defineRoute<{ id: string }>({
  access: 'user',
  permissions: ['appointments.update'],
  handler: async ({ tx, ctx, body, params }) =>
    ok(await appointmentService.update(tx, ctx, params.id, body)),
});
