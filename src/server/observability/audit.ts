import type { RequestContext } from '@/server/auth/context';
import { auditLogs, phiAccessLogs } from '@/server/db/schema';
import type { Tx } from '@/server/db/tenant';


const REDACTED_FIELDS = new Set([
  'dateOfBirth',
  'memberIdEncrypted',
  'groupNumberEncrypted',
  'credentialsEncrypted',
  'secretEncrypted',
  'codeHash',
  'tokenHash',
  'patientSnapshot',
]);

export interface AuditInput {
  action: string;
  resourceType: string;
  resourceId?: string | null;
  changes?: Record<string, { from: unknown; to: unknown }>;
  metadata?: Record<string, unknown>;
  organizationId?: string | null;
  actorSystem?: string;
}

export async function recordAudit(tx: Tx, ctx: RequestContext, input: AuditInput): Promise<void> {
  await tx.insert(auditLogs).values({
    organizationId: input.organizationId ?? ctx.organizationId ?? null,
    actorUserId: ctx.session?.userId ?? null,
    actorSystem: input.actorSystem ?? null,
    actorLabel: ctx.session?.userId ? null : (input.actorSystem ?? 'anonymous'),
    action: input.action,
    resourceType: input.resourceType,
    resourceId: input.resourceId ?? null,
    changes: input.changes ? redact(input.changes) : null,
    metadata: input.metadata ?? null,
    ipAddress: ctx.ipAddress,
    userAgent: ctx.userAgent,
    requestId: ctx.requestId,
  });
}

export interface PhiAccessInput {
  patientId: string;
  accessKind: 'view' | 'export' | 'print' | 'api_read';
  /** Which screen or endpoint: appointment_detail, report_export, admin_search */
  context: string;
  resourceId?: string | null;
  wasElevated?: boolean;
}


export async function recordPhiAccess(
  tx: Tx,
  ctx: RequestContext,
  input: PhiAccessInput,
): Promise<void> {
  await tx.insert(phiAccessLogs).values({
    organizationId: ctx.organizationId ?? null,
    actorUserId: ctx.session?.userId ?? null,
    patientId: input.patientId,
    accessKind: input.accessKind,
    context: input.context,
    resourceId: input.resourceId ?? null,
    wasElevated: input.wasElevated ?? ctx.isInternal,
    ipAddress: ctx.ipAddress,
    requestId: ctx.requestId,
  });
}

function redact(changes: Record<string, { from: unknown; to: unknown }>) {
  const out: Record<string, { from: unknown; to: unknown }> = {};
  for (const [field, value] of Object.entries(changes)) {
    out[field] = REDACTED_FIELDS.has(field)
      ? { from: '[redacted]', to: '[redacted]' }
      : value;
  }
  return out;
}

export function diff<T extends Record<string, unknown>>(
  before: T,
  after: Partial<T>,
): Record<string, { from: unknown; to: unknown }> {
  const changes: Record<string, { from: unknown; to: unknown }> = {};
  for (const [field, next] of Object.entries(after)) {
    const previous = before[field];
    if (JSON.stringify(previous) !== JSON.stringify(next)) {
      changes[field] = { from: previous, to: next };
    }
  }
  return changes;
}
