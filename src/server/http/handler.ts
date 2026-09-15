import { randomUUID } from 'node:crypto';

import type { NextRequest } from 'next/server';
import { ZodError, type ZodTypeAny, type z } from 'zod';

import { assertPermissions, loadPermissions, type RequestContext } from '@/server/auth/context';
import type { Permission } from '@/server/auth/permissions';
import { resolveSession } from '@/server/auth/session';
import { withActor, type ActorKind, type Tx } from '@/server/db/tenant';
import { requestLogger } from '@/server/observability/logger';

import { ApiError } from './errors';
import { failure } from './response';

/**
 * How a route decides who may call it.
 *
 *  public   -- no session; runs as an anonymous actor (marketplace, Direct pages)
 *  optional -- a session is used if present; otherwise anonymous
 *  user     -- a signed-in user acting inside an organization
 *  patient  -- a signed-in user with no tenant (Patient Account screens)
 *  account  -- any signed-in account, either interface, no tenant
 *  internal -- CareOndeck staff only (Control Center)
 *
 * `account` and `patient` enforce the same thing today. They are separate
 * because they mean different things, and one of them will change: `patient`
 * marks a screen that belongs to the patient interface and would gain a type
 * check if a provider ever reached it, while `account` marks an endpoint both
 * interfaces are meant to share -- changing your password, and whatever else
 * turns out to be the same job on both sides. Reaching for `patient` on a
 * shared endpoint would quietly rule out that future check.
 */
export type RouteAccess = 'public' | 'optional' | 'user' | 'patient' | 'account' | 'internal';

interface RouteConfig<TParams, TBody extends ZodTypeAny, TQuery extends ZodTypeAny> {
  access: RouteAccess;
  /** Checked against the caller's effective permissions. Ignored when public. */
  permissions?: readonly Permission[];
  body?: TBody;
  query?: TQuery;
  handler: (input: {
    ctx: RequestContext;
    tx: Tx;
    /**
     * Parsed and validated when a `body` schema is given -- then it is exactly
     * that schema's type. With no schema it is undefined at runtime and `any`
     * here; a route without a schema has no business reading it.
     */
    body: z.infer<TBody>;
    query: z.infer<TQuery>;
    params: TParams;
    request: NextRequest;
  }) => Promise<Response>;
}

/**
 * Wraps a route handler with the things every endpoint needs and none of them
 * should re-implement: request id, session resolution, permission check, input
 * validation, a tenant-scoped transaction, and error mapping.
 *
 * The handler body runs INSIDE the transaction, so throwing rolls back
 * everything -- including the audit rows written alongside the change.
 */
export function defineRoute<
  TParams = Record<string, string>,
  TBody extends ZodTypeAny = ZodTypeAny,
  TQuery extends ZodTypeAny = ZodTypeAny,
>(config: RouteConfig<TParams, TBody, TQuery>) {
  return async function route(
    request: NextRequest,
    context: { params: Promise<TParams> },
  ): Promise<Response> {
    const requestId = request.headers.get('x-request-id') ?? randomUUID();
    const log = requestLogger(requestId, { method: request.method, path: request.nextUrl.pathname });

    try {
      const session =
        config.access === 'public' ? null : await resolveSession(request);

      if (
        (config.access === 'user' ||
          config.access === 'patient' ||
          config.access === 'account') &&
        !session
      ) {
        throw ApiError.unauthenticated();
      }
      if (config.access === 'internal' && session?.userType !== 'internal') {
        throw ApiError.forbidden('Control Center access is required.');
      }

      let organizationId: string | null = null;
      let facilityId: string | null = null;
      let permissions = new Set<Permission>();

      if (config.access === 'user') {
        organizationId = resolveOrganizationId(request, session);
        if (!organizationId) {
          throw ApiError.badRequest(
            'No active organization. Choose one with the facility switcher, or send X-Organization-Id.',
          );
        }
        const resolved = await loadPermissions(session!.userId, organizationId);
        permissions = resolved.permissions;
        facilityId = session!.activeFacilityId ?? resolved.facilityId;
      } else if (config.access === 'optional' && session?.activeOrganizationId) {
        organizationId = session.activeOrganizationId;
        const resolved = await loadPermissions(session.userId, organizationId);
        permissions = resolved.permissions;
        facilityId = session.activeFacilityId ?? resolved.facilityId;
      }

      const ctx: RequestContext = {
        requestId,
        session,
        organizationId,
        facilityId,
        permissions,
        isInternal: session?.userType === 'internal',
        ipAddress: clientIp(request),
        userAgent: request.headers.get('user-agent'),
      };

      assertPermissions(ctx, config.permissions ?? []);

      const body = config.body ? config.body.parse(await readJson(request)) : undefined;
      const query = config.query
        ? config.query.parse(Object.fromEntries(request.nextUrl.searchParams))
        : undefined;
      const params = await context.params;

      const actorKind: ActorKind = ctx.isInternal
        ? 'internal'
        : organizationId
          ? 'user'
          : session
            ? 'user'
            : 'anonymous';

      // A signed-in patient has no tenant, so it runs as an anonymous actor
      // with a user id -- the patient policies key off current_user_id.
      const kind: ActorKind = actorKind === 'user' && !organizationId ? 'anonymous' : actorKind;

      return await withActor(
        {
          kind,
          userId: session?.userId,
          organizationId: organizationId ?? undefined,
          facilityId: facilityId ?? undefined,
          requestId,
        },
        (tx) => config.handler({ ctx, tx, body, query, params, request }),
      );
    } catch (error) {
      return handleError(error, requestId, log);
    }
  };
}

function resolveOrganizationId(
  request: NextRequest,
  session: Awaited<ReturnType<typeof resolveSession>>,
): string | null {
  // An explicit header wins so the Facility Switcher can act without first
  // writing the session row. loadPermissions() then rejects it if the user is
  // not actually a member -- the header is a hint, never an authorisation.
  return request.headers.get('x-organization-id') ?? session?.activeOrganizationId ?? null;
}

function clientIp(request: NextRequest): string | null {
  const forwarded = request.headers.get('x-forwarded-for');
  return forwarded?.split(',')[0]?.trim() ?? request.headers.get('x-real-ip') ?? null;
}

async function readJson(request: NextRequest): Promise<unknown> {
  if (request.method === 'GET' || request.method === 'HEAD') return undefined;
  const text = await request.text();
  if (!text) return undefined;
  try {
    return JSON.parse(text);
  } catch {
    throw ApiError.badRequest('Request body is not valid JSON.');
  }
}

function handleError(error: unknown, requestId: string, log: ReturnType<typeof requestLogger>) {
  if (error instanceof ZodError) {
    const details = error.issues.map((i) => ({ path: i.path.join('.'), message: i.message }));
    log.info({ details }, 'validation failed');
    return failure(new ApiError('VALIDATION_FAILED', 'Some fields need attention.', { details }), requestId);
  }

  if (error instanceof ApiError) {
    // 4xx is the caller's problem and is not worth an error-level line.
    if (error.status >= 500) log.error({ err: error, cause: error.cause }, error.message);
    else log.info({ code: error.code }, error.message);
    return failure(error, requestId);
  }

  // Postgres raises 23514 for a violated exclusion constraint, which for us
  // means two people took the same slot. Surface it as the domain error rather
  // than a 500 -- the UI needs to re-render the picker, not show a crash.
  if (isUniqueViolation(error)) {
    log.info({ err: error }, 'conflict');
    return failure(ApiError.slotUnavailable(), requestId);
  }

  log.error({ err: error }, 'unhandled error');
  return failure(ApiError.internal(), requestId);
}

function isUniqueViolation(error: unknown): boolean {
  const code = (error as { code?: string } | null)?.code;
  return code === '23505' || code === '23P01';
}
