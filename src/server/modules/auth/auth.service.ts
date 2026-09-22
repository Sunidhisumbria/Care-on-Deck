
import { and, desc, eq, gt, isNull, ne, sql } from 'drizzle-orm';

import type { RequestContext } from '@/server/auth/context';
import { issueSession, type IssuedSession } from '@/server/auth/session';
import { env } from '@/server/config/env';
import {
  onboardingSessions,
  memberships,
  organizations,
  outboundMessages,
  patients,
  roles,
  sessions,
  userCredentials,
  userIdentities,
  users,
  verificationCodes,
} from '@/server/db/schema';
import { assumeUser, withElevated, withSystem, type Tx } from '@/server/db/tenant';
import { ApiError, IntegrationNotConfiguredError } from '@/server/http/errors';
import { consumeRateLimit, RATE_LIMITS } from '@/server/http/ratelimit';
import { notImplemented } from '@/server/http/response';
import { firebaseAuth, postmark, telnyx } from '@/server/integrations';
import {
  decoyHash,
  hashPassword,
  needsRehash,
  verifyPassword,
} from '@/server/security/password';
import { recordAudit } from '@/server/observability/audit';
import { logger } from '@/server/observability/logger';
import { AUTOMATIC_STEPS } from '@/server/modules/onboarding/onboarding.schemas';
import { nextStep } from '@/server/modules/onboarding/onboarding.service';

import type {
  ChangePasswordInput,
  ForgotPasswordInput,
  LoginInput,
  OtpPurpose,
  ResetPasswordInput,
  SendOtpInput,
  SignupInput,
  InterfaceRole,
  SocialProvider,
  SocialSignInInput,
  SwitchOrganizationInput,
  VerifyOtpInput,
} from './auth.schemas';
import {
  codeMatches,
  generateCode,
  hashCode,
  OTP_MAX_ATTEMPTS,
  OTP_RESEND_INTERVAL_SECONDS,
  OTP_TTL_SECONDS,
  otpMessage,
  PROOF_TTL_SECONDS,
  signProof,
  verifyProof,
  type VerificationProof,
} from './otp';

// --- shapes returned to routes -------------------------------------------

export interface SendOtpResult {
  channel: 'sms' | 'email';
  /** Masked: +1•••••4567, s•••@example.com. Never the raw destination. */
  destination: string;
  expires_in: number;
  resend_in: number;
  /** Present only in local development when no delivery vendor is configured. */
  dev_code?: string;
}

export interface VerifyOtpResult {
  body: {
    verified: true;
    purpose: OtpPurpose;
    /** Hand this to the step that follows -- signup or password reset. */
    verification_token: string;
    verification_expires_in: number;
    /** Set when the code signed the user in (purpose: login). */
    signed_in?: boolean;
    /** Likewise -- who, and which interface to land on. Matches login/signup. */
    user_id?: string;
    user_type?: UserType;
  };
  /** The route turns this into the cookie and the token pair in the body. */
  session?: IssuedSession;
}

/**
 * What kind of account signed in.
 *
 * The client asks who it is signing in *as* -- it never tells us. A role that
 * arrived in the request body would be a claim from the browser; this comes
 * from `users.type`, which only onboarding can set. The frontend uses it to
 * pick which interface to land on.
 */
export type UserType = 'patient' | 'staff' | 'provider' | 'internal';

export interface SignupResult {
  /**
   * No session. The account exists but nothing has proved the person holds
   * the mobile number yet, so there is nothing to sign in. Verifying the code
   * is what issues the token pair -- see `verifyOtp`.
   */
  body: {
    user_id: string;
    /** Null for a provider, who has no patient record. */
    patient_id: string | null;
    /** The provider's application; null for a patient. */
    onboarding_session_id: string | null;
    user_type: UserType;
    phone_verified: boolean;
    email_verified: boolean;
    next_step: 'verify_mobile';
  };
}

export interface LoginResult {
  body: { user_id: string; user_type: UserType; signed_in: true };
  session: IssuedSession;
}

export interface SocialSignInResult {
  body: {
    user_id: string;
    user_type: UserType;
    signed_in: true;
    /** True when this sign-in created the account rather than matching one. */
    is_new_account: boolean;
    /** True when it attached to an account that already existed on this email. */
    linked_to_existing: boolean;
  };
  session: IssuedSession;
}

export interface CurrentUser {
  user: {
    id: string;
    type: 'patient' | 'staff' | 'provider' | 'internal';
    email: string | null;
    email_verified: boolean;
    phone: string | null;
    phone_verified: boolean;
    first_name: string | null;
    last_name: string | null;
    avatar_url: string | null;
    mfa_enabled: boolean;
  } | null;
  memberships: MembershipSummary[];
  active_organization_id: string | null;
  active_facility_id: string | null;
  permissions: string[];
}

export interface MembershipSummary {
  organization_id: string;
  organization_name: string;
  organization_slug: string;
  facility_id: string | null;
  role_key: string;
  role_name: string;
}

// --- service ---------------------------------------------------------------

export const authService = {

  async sendOtp(tx: Tx, ctx: RequestContext, input: SendOtpInput): Promise<SendOtpResult> {
    const { channel, destination, purpose } = input;

    await consumeRateLimit(
      `otp:send:dest:${destination}`,
      RATE_LIMITS.otpSendPerDestination,
      'Too many codes have been sent to this number or address. Please wait an hour.',
    );
    if (ctx.ipAddress) {
      await consumeRateLimit(`otp:send:ip:${ctx.ipAddress}`, RATE_LIMITS.otpSendPerIp);
    }

    // Codes are server-only rows: every read and write below is elevated.
    const [latest] = await withElevated(tx, () =>
      tx
        .select({ createdAt: verificationCodes.createdAt })
        .from(verificationCodes)
        .where(
          and(
            eq(verificationCodes.destination, destination),
            eq(verificationCodes.purpose, purpose),
            isNull(verificationCodes.consumedAt),
            gt(verificationCodes.expiresAt, new Date()),
          ),
        )
        .orderBy(desc(verificationCodes.createdAt))
        .limit(1),
    );

    if (latest) {
      const sinceLast = (Date.now() - latest.createdAt.getTime()) / 1000;
      if (sinceLast < OTP_RESEND_INTERVAL_SECONDS) {
        const wait = Math.ceil(OTP_RESEND_INTERVAL_SECONDS - sinceLast);
        throw new ApiError('RATE_LIMITED', `A code was just sent. You can request another in ${wait} seconds.`, {
          details: { retryAfterSeconds: wait },
        });
      }
    }

    let recipientUserId: string | null = ctx.session?.userId ?? null;
    if (purpose === 'login' || purpose === 'password_reset') {
      const existing = await findUserByDestination(tx, channel, destination);
      if (!existing) {
        logger.info({ purpose, channel }, 'otp requested for unknown account; not sent');
        return {
          channel,
          destination: maskDestination(channel, destination),
          expires_in: OTP_TTL_SECONDS,
          resend_in: OTP_RESEND_INTERVAL_SECONDS,
        };
      }
      recipientUserId = existing.id;
    }

    // A new code replaces every earlier one for this address and purpose.
    // Deleted rather than expired: a superseded code is of no use to anyone,
    // and the row still names the address it went to.
    await withElevated(tx, () =>
      tx
        .delete(verificationCodes)
        .where(and(eq(verificationCodes.destination, destination), eq(verificationCodes.purpose, purpose))),
    );

    const code = generateCode();
    const expiresAt = new Date(Date.now() + OTP_TTL_SECONDS * 1000);
    const [row] = await withElevated(tx, () =>
      tx
        .insert(verificationCodes)
        .values({
          userId: recipientUserId,
          purpose,
          destination,
          codeHash: hashCode(code, destination, purpose),
          maxAttempts: OTP_MAX_ATTEMPTS,
          expiresAt,
        })
        .returning({ id: verificationCodes.id }),
    );
    if (!row) throw ApiError.internal('Could not create a verification code.');

    const delivery = await deliverCode({ channel, destination, purpose, code, codeId: row.id });

    const message = otpMessage(code, purpose);
    await withElevated(tx, () =>
      tx.insert(outboundMessages).values({
        organizationId: null,
        recipientUserId,
        channel,
        vendor: delivery.vendor,
        templateKey: `otp.${purpose}`,
        destination,
        subject: channel === 'email' ? message.subject : null,
        status: delivery.status,
        vendorMessageId: delivery.vendorMessageId,
        attempts: 1,
        sentAt: delivery.status === 'sent' ? new Date() : null,
      }),
    );

    return {
      channel,
      destination: maskDestination(channel, destination),
      expires_in: OTP_TTL_SECONDS,
      resend_in: OTP_RESEND_INTERVAL_SECONDS,
      ...(delivery.devCode ? { dev_code: delivery.devCode } : {}),
    };
  },

  /**
   * Checks a code. A wrong code counts as an attempt whether or not this
   * request's transaction survives -- the increment runs in a transaction of
   * its own for exactly that reason.
   */
  async verifyOtp(tx: Tx, ctx: RequestContext, input: VerifyOtpInput): Promise<VerifyOtpResult> {
    const { channel, destination, purpose, code } = input;

    await consumeRateLimit(
      `otp:verify:dest:${destination}`,
      RATE_LIMITS.otpVerifyPerDestination,
      'Too many attempts for this number or address. Please wait an hour.',
    );

    const [row] = await withElevated(tx, () =>
      tx
        .select()
        .from(verificationCodes)
        .where(
          and(
            eq(verificationCodes.destination, destination),
            eq(verificationCodes.purpose, purpose),
            isNull(verificationCodes.consumedAt),
          ),
        )
        .orderBy(desc(verificationCodes.createdAt))
        .limit(1),
    );

    if (!row) throw ApiError.forbidden('No active code. Request a new one.');
    if (row.expiresAt.getTime() < Date.now()) {
      throw ApiError.forbidden('That code has expired. Request a new one.');
    }
    if (row.attempts >= row.maxAttempts) {
      throw ApiError.forbidden('Too many wrong attempts. Request a new code.');
    }

    if (!codeMatches(code, destination, purpose, row.codeHash)) {
      // Autonomous write: must survive the rollback this throw will cause.
      await withSystem({ requestId: ctx.requestId }, (own) =>
        own
          .update(verificationCodes)
          .set({ attempts: sql`${verificationCodes.attempts} + 1`, updatedAt: new Date() })
          .where(eq(verificationCodes.id, row.id)),
      );
      const left = row.maxAttempts - row.attempts - 1;
      throw ApiError.forbidden(
        left > 0
          ? `That code is not right. ${left} attempt${left === 1 ? '' : 's'} left.`
          : 'That code is not right. Request a new code.',
      );
    }

    await withElevated(tx, () =>
      tx
        .update(verificationCodes)
        .set({ consumedAt: new Date(), attempts: row.attempts + 1 })
        .where(eq(verificationCodes.id, row.id)),
    );

    const verificationToken = signProof({ codeId: row.id, purpose, channel, destination });
    const result: VerifyOtpResult = {
      body: {
        verified: true,
        purpose,
        verification_token: verificationToken,
        verification_expires_in: PROOF_TTL_SECONDS,
      },
    };

    /*
     * Confirming contact details. Two callers reach here: someone already
     * signed in changing their number or address, and a brand-new account
     * finishing signup. The second has no session -- the code is what proves
     * they hold the number -- so the owner is found by the destination and a
     * session is issued once it checks out.
     */
    if (purpose === 'verify_mobile' || purpose === 'verify_email') {
      const owner = ctx.session
        ? await findUserById(tx, ctx.session.userId)
        : await findUserByDestination(tx, channel, destination);

      if (!owner) throw ApiError.forbidden('No account is waiting on that code.');
      if (owner.status !== 'active') throw ApiError.forbidden('This account is not active.');

      // Anonymous at this point when finishing signup, so the write is elevated.
      await withElevated(tx, () =>
        tx
          .update(users)
          .set(
            purpose === 'verify_mobile'
              ? { phone: destination, phoneVerifiedAt: new Date() }
              : { email: destination, emailVerifiedAt: new Date() },
          )
          .where(eq(users.id, owner.id)),
      );

      if (!ctx.session) {
        assertRoleMatches(input.role, owner.type, 'Could not sign in with that code.');
        await assumeUser(tx, owner.id);
        result.session = await issueSession(tx, {
          userId: owner.id,
          ipAddress: ctx.ipAddress,
          userAgent: ctx.userAgent,
          deviceToken: input.device_token ?? null,
          deviceType: input.device_type ?? null,
        });
        // Spent: nothing follows this code, so it is deleted rather than kept.
        await withElevated(tx, () => tx.delete(verificationCodes).where(eq(verificationCodes.id, row.id)));
        await tx.update(users).set({ lastSeenAt: new Date() }).where(eq(users.id, owner.id));
        result.body.signed_in = true;
        result.body.user_id = owner.id;
        result.body.user_type = owner.type;
      }

      await recordAudit(
        tx,
        { ...ctx, session: ctx.session ?? emptySession(owner.id, owner.type) },
        {
          action: purpose === 'verify_mobile' ? 'auth.phone_verified' : 'auth.email_verified',
          resourceType: 'user',
          resourceId: owner.id,
        },
      );
    }

    // Passwordless sign-in: the code itself was the credential.
    if (purpose === 'login') {
      const user = await findUserByDestination(tx, channel, destination);
      if (!user) throw ApiError.forbidden('Could not sign in with that code.');
      if (user.status !== 'active') throw ApiError.forbidden('This account is not active.');
      assertRoleMatches(input.role, user.type, 'Could not sign in with that code.');

      // Receiving this code proved the contact it went to, which is exactly
      // what verification asks for -- so an account that skipped that step is
      // verified by getting in this way, rather than staying stuck.
      const proves =
        channel === 'sms'
          ? !user.phoneVerifiedAt && { phoneVerifiedAt: new Date() }
          : !user.emailVerifiedAt && { emailVerifiedAt: new Date() };

      if (proves) {
        await withElevated(tx, () =>
          tx.update(users).set(proves).where(eq(users.id, user.id)),
        );
      }

      await assumeUser(tx, user.id);
      const session = await issueSession(tx, {
        userId: user.id,
        ipAddress: ctx.ipAddress,
        userAgent: ctx.userAgent,
        deviceToken: input.device_token ?? null,
        deviceType: input.device_type ?? null,
      });
      // Spent on signing in, so it is deleted rather than kept.
      await withElevated(tx, () => tx.delete(verificationCodes).where(eq(verificationCodes.id, row.id)));
      await tx.update(users).set({ lastSeenAt: new Date() }).where(eq(users.id, user.id));
      await recordAudit(
        tx,
        { ...ctx, session: { ...(ctx.session ?? emptySession(user.id, user.type)), userId: user.id } },
        { action: 'auth.signed_in', resourceType: 'user', resourceId: user.id, metadata: { method: `otp_${channel}` } },
      );

      result.body.signed_in = true;
      result.body.user_id = user.id;
      result.body.user_type = user.type;
      result.session = session;
    }

    return result;
  },

  /**
   * Spends a verification proof on its follow-up action. Single use: the
   * code row is deleted here, so a second call with the same proof finds
   * nothing and is refused.
   */
  async completeVerification(
    tx: Tx,
    token: string,
    purpose: OtpPurpose,
  ): Promise<VerificationProof> {
    const proof = verifyProof(token, purpose);

    const [row] = await withElevated(tx, () =>
      tx
        .select({
          id: verificationCodes.id,
          destination: verificationCodes.destination,
          consumedAt: verificationCodes.consumedAt,
          completedAt: verificationCodes.completedAt,
        })
        .from(verificationCodes)
        .where(eq(verificationCodes.id, proof.codeId))
        .limit(1),
    );

    if (!row || !row.consumedAt || row.destination !== proof.destination) {
      throw ApiError.forbidden('The verification token is not valid.');
    }
    if (row.completedAt) {
      throw ApiError.forbidden('This verification has already been used. Request a new code.');
    }

    await withElevated(tx, () => tx.delete(verificationCodes).where(eq(verificationCodes.id, row.id)));

    return proof;
  },

  async revokeSession(tx: Tx, ctx: RequestContext): Promise<{ signedOut: true }> {
    if (!ctx.session) return { signedOut: true };
    await tx
      .update(sessions)
      .set({ revokedAt: new Date() })
      .where(eq(sessions.id, ctx.session.sessionId));
    await recordAudit(tx, ctx, {
      action: 'auth.signed_out',
      resourceType: 'session',
      resourceId: ctx.session.sessionId,
    });
    return { signedOut: true };
  },

  /**
   * Identity, memberships and effective permissions -- everything the
   * frontend needs to decide which navigation to render.
   */
  async getCurrentUser(tx: Tx, ctx: RequestContext): Promise<CurrentUser> {
    if (!ctx.session) {
      return {
        user: null,
        memberships: [],
        active_organization_id: null,
        active_facility_id: null,
        permissions: [],
      };
    }

    const [user] = await tx
      .select({
        id: users.id,
        type: users.type,
        email: users.email,
        emailVerifiedAt: users.emailVerifiedAt,
        phone: users.phone,
        phoneVerifiedAt: users.phoneVerifiedAt,
        firstName: users.firstName,
        lastName: users.lastName,
        avatarUrl: users.avatarUrl,
        mfaEnabled: users.mfaEnabled,
      })
      .from(users)
      .where(eq(users.id, ctx.session.userId))
      .limit(1);

    if (!user) throw ApiError.unauthenticated();

    return {
      user: {
        id: user.id,
        type: user.type,
        email: user.email,
        email_verified: user.emailVerifiedAt !== null,
        phone: user.phone,
        phone_verified: user.phoneVerifiedAt !== null,
        first_name: user.firstName,
        last_name: user.lastName,
        avatar_url: user.avatarUrl,
        mfa_enabled: user.mfaEnabled,
      },
      memberships: await this.listMemberships(tx, ctx),
      active_organization_id: ctx.session.activeOrganizationId,
      active_facility_id: ctx.session.activeFacilityId,
      permissions: [...ctx.permissions],
    };
  },

  /** IA: 6. Unified Dashboard > Facility Switcher */
  async listMemberships(tx: Tx, ctx: RequestContext): Promise<MembershipSummary[]> {
    if (!ctx.session) return [];
    const rows = await tx
      .select({
        organization_id: memberships.organizationId,
        organization_name: organizations.name,
        organization_slug: organizations.slug,
        facility_id: memberships.facilityId,
        role_key: roles.key,
        role_name: roles.name,
      })
      .from(memberships)
      .innerJoin(organizations, eq(organizations.id, memberships.organizationId))
      .innerJoin(roles, eq(roles.id, memberships.roleId))
      .where(
        and(
          eq(memberships.userId, ctx.session.userId),
          eq(memberships.status, 'active'),
          isNull(memberships.deletedAt),
          isNull(organizations.deletedAt),
        ),
      )
      .orderBy(organizations.name);
    return rows;
  },

  /**
   * Re-checks membership before writing the session: the request is a hint,
   * never an authorisation.
   */
  async switchOrganization(
    tx: Tx,
    ctx: RequestContext,
    input: SwitchOrganizationInput,
  ): Promise<{ active_organization_id: string; active_facility_id: string | null }> {
    if (!ctx.session) throw ApiError.unauthenticated();

    const [membership] = await tx
      .select({ facilityId: memberships.facilityId })
      .from(memberships)
      .where(
        and(
          eq(memberships.userId, ctx.session.userId),
          eq(memberships.organizationId, input.organization_id),
          eq(memberships.status, 'active'),
          isNull(memberships.deletedAt),
        ),
      )
      .limit(1);
    if (!membership) throw ApiError.forbidden('You are not a member of that organization.');

    // A facility-scoped member may only act in their own facility.
    const facilityId = input.facility_id ?? membership.facilityId ?? null;
    if (membership.facilityId && facilityId !== membership.facilityId) {
      throw ApiError.forbidden('Your access is limited to one facility.');
    }

    await tx
      .update(sessions)
      .set({ activeOrganizationId: input.organization_id, activeFacilityId: facilityId })
      .where(eq(sessions.id, ctx.session.sessionId));

    await recordAudit(tx, ctx, {
      action: 'auth.switched_organization',
      resourceType: 'session',
      resourceId: ctx.session.sessionId,
      organizationId: input.organization_id,
      metadata: { facilityId },
    });

    return { active_organization_id: input.organization_id, active_facility_id: facilityId };
  },

  /**
   * Changes the password of whoever is signed in.
   *
   * Unlike a reset, this one does compare against the current password, in
   * both directions. The old one is required as proof it is really them --
   * a live session only proves the laptop is unlocked -- and the new one must
   * differ from it, which is worth saying here because the person supplied
   * both knowingly. On the reset path neither holds: they have forgotten the
   * password, and telling them a guess matched would confirm it to whoever is
   * holding the reset code.
   *
   * Every other session is revoked, but this one is kept. Changing a password
   * on purpose should not sign you out of the tab you did it in; the point is
   * to evict everyone else.
   */
  async changePassword(
    tx: Tx,
    ctx: RequestContext,
    input: ChangePasswordInput,
  ): Promise<{ password_changed: true; sessions_revoked: number }> {
    const session = ctx.session;
    if (!session) throw ApiError.unauthenticated('Please sign in again.');

    // This endpoint answers "is this the right password?", so it is an oracle
    // for anyone holding a stolen session. Counted before any hashing.
    await consumeRateLimit(
      `password:change:user:${session.userId}`,
      RATE_LIMITS.passwordChangePerUser,
      'Too many attempts. Please wait fifteen minutes and try again.',
    );

    const current = await withElevated(tx, async () => {
      const [row] = await tx
        .select({ passwordHash: userCredentials.passwordHash })
        .from(userCredentials)
        .where(eq(userCredentials.userId, session.userId))
        .limit(1);
      return row?.passwordHash ?? null;
    });

    // Social accounts have no password row to change. Say so plainly rather
    // than failing a comparison against nothing.
    if (!current) {
      throw new ApiError(
        'VALIDATION_FAILED',
        'This account signs in with Google or Apple, so it has no password to change.',
      );
    }

    if (!(await verifyPassword(input.current_password, current))) {
      throw new ApiError('VALIDATION_FAILED', 'That is not your current password.', {
        details: [{ path: 'current_password', message: 'That is not your current password.' }],
      });
    }

    if (await verifyPassword(input.password, current)) {
      throw new ApiError('VALIDATION_FAILED', 'Choose a password you are not already using.', {
        details: [
          { path: 'password', message: 'This is your current password. Choose a different one.' },
        ],
      });
    }

    const passwordHash = await hashPassword(input.password);
    const now = new Date();

    await withElevated(tx, () =>
      tx
        .update(userCredentials)
        .set({ passwordHash, passwordChangedAt: now, updatedAt: now })
        .where(eq(userCredentials.userId, session.userId)),
    );

    const revoked = await withElevated(tx, () =>
      tx
        .update(sessions)
        .set({ revokedAt: now })
        .where(
          and(
            eq(sessions.userId, session.userId),
            isNull(sessions.revokedAt),
            ne(sessions.id, session.sessionId),
          ),
        )
        .returning({ id: sessions.id }),
    );

    await recordAudit(tx, ctx, {
      action: 'auth.password_changed',
      resourceType: 'user',
      resourceId: session.userId,
      metadata: { sessionsRevoked: revoked.length },
    });

    return { password_changed: true, sessions_revoked: revoked.length };
  },

  /**
   * Starts a password reset by sending a code to the account's email.
   *
   * An address with no account is refused outright, and the message says so.
   * The alternative -- answering identically either way -- keeps the endpoint
   * from confirming which addresses are registered, but it also sends someone
   * who simply mistyped their email to a code screen where nothing ever
   * arrives. This was a product decision in favour of the clearer path.
   *
   * The exposure that buys is worth being precise about: anyone can now test
   * whether a given email has a CareOndeck account, one address at a time.
   * `RATE_LIMITS.otpSendPerIp` is what keeps that from becoming a bulk list,
   * so it is load-bearing here in a way it was not before.
   */
  async forgotPassword(
    tx: Tx,
    ctx: RequestContext,
    input: ForgotPasswordInput,
  ): Promise<SendOtpResult> {
    const existing = await findUserByDestination(tx, 'email', input.email);
    if (!existing) {
      throw new ApiError('NOT_FOUND', 'No account found for that email address.', {
        // Shaped so the form can put it under the Email field rather than in a
        // toast -- it is a correction to what was typed.
        details: [{ path: 'email', message: 'No account found for that email address.' }],
      });
    }

    return this.sendOtp(tx, ctx, {
      channel: 'email',
      destination: input.email,
      purpose: 'password_reset',
    });
  },

  /**
   * Sign-up, for both interfaces.
   *
   * A patient gets three rows in one transaction: the login identity, the
   * password hash, and the patient record carrying date of birth, gender and
   * home location.
   *
   * A provider gets the identity, the password hash and an onboarding
   * application -- and deliberately no `providers` row. A provider record needs a
   * practice (`providers.organization_id` is required) and a checked NPI, and
   * both come later in onboarding. Creating one here would mean either an
   * invented practice or a half-built provider in tables the marketplace reads.
   * It is created at submission, from the application's answers.
   *
   * Either way the account starts unverified, and proving a contact is what signs
   * someone in -- see `verifyOtp`.
   *
   * IA: 2. Patient Booking > Account Creation; 4. Provider Onboarding > Create Account
   */
  async signup(tx: Tx, ctx: RequestContext, input: SignupInput): Promise<SignupResult> {
    if (ctx.ipAddress) {
      await consumeRateLimit(`signup:ip:${ctx.ipAddress}`, RATE_LIMITS.signupPerIp);
    }

    // Uniqueness is checked here for a readable message and enforced by the
    // unique index underneath, which is what actually holds under a race.
    const existingEmail = await findUserByDestination(tx, 'email', input.email);
    if (existingEmail) {
      throw ApiError.conflict('An account already exists for that email address.', {
        field: 'email',
      });
    }
    const existingPhone = await findUserByDestination(tx, 'sms', input.phone);
    if (existingPhone) {
      throw ApiError.conflict('An account already exists for that mobile number.', {
        field: 'phone',
      });
    }

    const passwordHash = await hashPassword(input.password);

    const created = await withElevated(tx, async () => {
      const [user] = await tx
        .insert(users)
        .values({
          type: input.role,
          status: 'active',
          email: input.email,
          phone: input.phone,
          firstName: input.first_name,
          lastName: input.last_name,
        })
        .returning({ id: users.id });
      if (!user) throw ApiError.internal('Could not create the account.');

      await tx.insert(userCredentials).values({ userId: user.id, passwordHash });

      if (input.role === 'provider') {
        const [application] = await tx
          .insert(onboardingSessions)
          .values({
            kind: 'provider',
            userId: user.id,
            // Account creation is the step this call has just completed.
            completedSteps: [...AUTOMATIC_STEPS],
            currentStep: nextStep(AUTOMATIC_STEPS),
          })
          .returning({ id: onboardingSessions.id });
        if (!application) throw ApiError.internal('Could not start the provider application.');

        return { userId: user.id, patientId: null, onboardingSessionId: application.id };
      }

      const [patient] = await tx
        .insert(patients)
        .values({
          userId: user.id,
          firstName: input.first_name,
          lastName: input.last_name,
          dateOfBirth: input.date_of_birth,
          gender: input.gender,
          email: input.email,
          phone: input.phone,
          locationPlaceId: input.location?.place_id ?? null,
          locationLabel: input.location?.label ?? null,
          locationLatitude: input.location?.latitude ?? null,
          locationLongitude: input.location?.longitude ?? null,
        })
        .returning({ id: patients.id });
      if (!patient) throw ApiError.internal('Could not create the patient record.');

      return { userId: user.id, patientId: patient.id, onboardingSessionId: null };
    });

    await assumeUser(tx, created.userId);

    await recordAudit(tx, ctx, {
      action: 'auth.signed_up',
      resourceType: 'user',
      resourceId: created.userId,
      metadata: { method: 'password', accountType: input.role },
    });

    return {
      body: {
        user_id: created.userId,
        patient_id: created.patientId,
        onboarding_session_id: created.onboardingSessionId,
        user_type: input.role,
        phone_verified: false,
        email_verified: false,
        /** The screen sends the user here next. */
        next_step: 'verify_mobile',
      },
    };
  },

  /**
   * Email and password sign-in.
   *
   * Answers identically whether the email is unknown or the password is wrong,
   * and spends the same time either way -- a fast "no such account" is a
   * reliable way to enumerate who has one.
   */
  async login(tx: Tx, ctx: RequestContext, input: LoginInput): Promise<LoginResult> {
    await consumeRateLimit(
      `login:email:${input.email}`,
      RATE_LIMITS.loginPerEmail,
      'Too many sign-in attempts for this account. Please wait, then try again.',
    );
    if (ctx.ipAddress) {
      await consumeRateLimit(`login:ip:${ctx.ipAddress}`, RATE_LIMITS.loginPerIp);
    }

    const user = await findUserByDestination(tx, 'email', input.email);

    const stored = user
      ? await withElevated(tx, async () => {
          const [row] = await tx
            .select({ passwordHash: userCredentials.passwordHash })
            .from(userCredentials)
            .where(eq(userCredentials.userId, user.id))
            .limit(1);
          return row?.passwordHash ?? null;
        })
      : null;

    // Spend the same work when there is nothing to check against.
    const matches = await verifyPassword(input.password, stored ?? (await decoyHash()));

    if (!user || !stored || !matches) {
      throw ApiError.forbidden('Invalid email or password.');
    }
    if (user.status !== 'active') {
      throw ApiError.forbidden('This account is not active.');
    }
    assertRoleMatches(input.role, user.type, 'Invalid email or password.');

    /*
     * The password alone is not enough to get in.
     *
     * Signup collects a mobile number and an email and sends a code to one of
     * them -- the person chooses which. Either one proves the account is
     * reachable and belongs to whoever is holding it, so either one opens this
     * door; requiring the phone specifically would lock out everyone who chose
     * email. What is refused is an account that proved neither, which without
     * this check could sign in by password forever and make the whole
     * verification step decoration.
     *
     * Social accounts do not come this way: their provider vouched for the
     * identity, and their email is verified at creation.
     */
    if (!user.phoneVerifiedAt && !user.emailVerifiedAt) {
      throw ApiError.accountUnverified({ phone: user.phone, email: user.email });
    }

    // Cheap to do here, and it upgrades stored hashes as cost settings rise.
    if (needsRehash(stored)) {
      const upgraded = await hashPassword(input.password);
      await withElevated(tx, () =>
        tx
          .update(userCredentials)
          .set({ passwordHash: upgraded, updatedAt: new Date() })
          .where(eq(userCredentials.userId, user.id)),
      );
    }

    await assumeUser(tx, user.id);
    const session = await issueSession(tx, {
      userId: user.id,
      ipAddress: ctx.ipAddress,
      userAgent: ctx.userAgent,
      deviceToken: input.device_token ?? null,
      deviceType: input.device_type ?? null,
    });
    await tx.update(users).set({ lastSeenAt: new Date() }).where(eq(users.id, user.id));

    await recordAudit(
      tx,
      { ...ctx, session: ctx.session ?? emptySession(user.id, user.type) },
      {
        action: 'auth.signed_in',
        resourceType: 'user',
        resourceId: user.id,
        metadata: { method: 'password' },
      },
    );

    return {
      body: { user_id: user.id, user_type: user.type, signed_in: true },
      session,
    };
  },

  /**
   * Sets a new password using the token from /auth/otp/verify.
   *
   * Every existing session is revoked. If the reset was prompted by someone
   * else being in the account, leaving their session alive would defeat the
   * whole exercise.
   */
  async resetPassword(
    tx: Tx,
    ctx: RequestContext,
    input: ResetPasswordInput,
  ): Promise<{ password_changed: true; sessions_revoked: number }> {
    const proof = await this.completeVerification(tx, input.verification_token, 'password_reset');

    const channel = proof.channel;
    const user = await findUserByDestination(tx, channel, proof.destination);
    if (!user) throw ApiError.forbidden('The verification token is not valid.');

    /*
     * Deliberately no "must differ from your current password" check here.
     * Someone on this path has forgotten their password -- being told the one
     * they just chose happens to match it is confusing rather than helpful,
     * and it confirms a guess at the old password to whoever is holding the
     * reset code. That rule belongs on a signed-in change-password flow, where
     * the person knowingly supplies both.
     */
    const passwordHash = await hashPassword(input.password);
    const now = new Date();

    /*
     * Completing a reset means a code sent to this contact was received and
     * entered, which is exactly what verification asks for. Recording it here
     * keeps the rule consistent: without this, someone who signed up, skipped
     * verification and then reset their password would be told to verify a
     * contact they had just demonstrably proved.
     */
    const proves =
      channel === 'sms'
        ? !user.phoneVerifiedAt && { phoneVerifiedAt: now }
        : !user.emailVerifiedAt && { emailVerifiedAt: now };

    if (proves) {
      await withElevated(tx, () =>
        tx.update(users).set(proves).where(eq(users.id, user.id)),
      );
    }

    await withElevated(tx, () =>
      tx
        .insert(userCredentials)
        .values({ userId: user.id, passwordHash, passwordChangedAt: now })
        .onConflictDoUpdate({
          target: userCredentials.userId,
          set: { passwordHash, passwordChangedAt: now, updatedAt: now },
        }),
    );

    const revoked = await withElevated(tx, () =>
      tx
        .update(sessions)
        .set({ revokedAt: now })
        .where(and(eq(sessions.userId, user.id), isNull(sessions.revokedAt)))
        .returning({ id: sessions.id }),
    );

    await recordAudit(
      tx,
      { ...ctx, session: ctx.session ?? emptySession(user.id, user.type) },
      {
        action: 'auth.password_reset',
        resourceType: 'user',
        resourceId: user.id,
        metadata: { sessionsRevoked: revoked.length },
      },
    );

    return { password_changed: true, sessions_revoked: revoked.length };
  },

  /**
   * Google or Apple sign-in.
   *
   * The provider authenticates the person; we verify the token they hand back
   * and issue our own session. No password is involved, and a social-only
   * account never gets a `user_credentials` row.
   *
   * IA: 15. External Services > Authentication > Google OAuth / Apple OAuth
   */
  async socialSignIn(
    tx: Tx,
    ctx: RequestContext,
    input: SocialSignInInput,
  ): Promise<SocialSignInResult> {
    if (ctx.ipAddress) {
      await consumeRateLimit(`social:ip:${ctx.ipAddress}`, RATE_LIMITS.loginPerIp);
    }

    const provider = input.social_type;
    const claims = await firebaseAuth.verifyIdToken(input.token);

    // The token is the only thing we trust. Everything else in the body is
    // the client's account of what happened, and has to agree with it.
    const expected = provider === 'google' ? 'google.com' : 'apple.com';
    if (claims.signInProvider !== expected) {
      throw ApiError.forbidden(`That token is not a ${provider} sign-in.`);
    }
    if (claims.uid !== input.social_id) {
      throw ApiError.forbidden('The sign-in token does not match the account it claims.');
    }

    return this.linkOrCreateSocialUser(tx, ctx, provider, {
      providerAccountId: claims.uid,
      email: claims.email,
      emailVerified: claims.emailVerified,
      firstName: input.first_name ?? null,
      lastName: input.last_name ?? null,
      role: input.role,
      deviceToken: input.device_token ?? null,
      deviceType: input.device_type ?? null,
    });
  },

  /**
   * Resolves a verified social identity to a user, and signs them in.
   *
   * Split out from `socialSignIn` so the matching rules -- which is where the
   * security decisions live -- can be tested without a live Firebase token.
   *
   * Matching order matters:
   *
   *  1. By provider account id. This is the only stable key. Apple lets people
   *     hide their address behind a `privaterelay.appleid.com` alias, so email
   *     matching silently fails for them.
   *  2. By email, but only when the provider says it is verified. Linking on an
   *     unverified address would let anyone with a matching claim walk into an
   *     existing account.
   *  3. Otherwise create a new account.
   */
  async linkOrCreateSocialUser(
    tx: Tx,
    ctx: RequestContext,
    provider: SocialProvider,
    claims: {
      providerAccountId: string;
      email: string | null;
      emailVerified: boolean;
      firstName: string | null;
      lastName: string | null;
      role?: InterfaceRole;
      deviceToken?: string | null;
      deviceType?: string | null;
    },
  ): Promise<SocialSignInResult> {
    const resolved = await withElevated(tx, async () => {
      // 1. Already linked?
      const [identity] = await tx
        .select({ userId: userIdentities.userId })
        .from(userIdentities)
        .where(
          and(
            eq(userIdentities.provider, provider),
            eq(userIdentities.providerAccountId, claims.providerAccountId),
          ),
        )
        .limit(1);

      if (identity) return { userId: identity.userId, created: false, linked: false };

      // 2. An existing account on this email?
      if (claims.email) {
        const [existing] = await tx
          .select({ id: users.id, status: users.status })
          .from(users)
          .where(and(eq(users.email, claims.email), isNull(users.deletedAt)))
          .limit(1);

        /*
         * An account exists but the provider will not vouch for the address.
         *
         * Linking would be account takeover. Creating a second account is not
         * an option either -- `users.email` is unique, so it fails on the
         * index with a 500 rather than anything a person can act on. Refuse
         * clearly instead. In practice this is rare: Google and Apple both
         * verify, and Apple's private-relay aliases arrive verified too.
         */
        if (existing && !claims.emailVerified) {
          throw ApiError.forbidden(
            'That provider did not confirm your email address. Please sign in with your password instead.',
          );
        }

        if (existing && claims.emailVerified) {
          await tx.insert(userIdentities).values({
            userId: existing.id,
            provider,
            providerAccountId: claims.providerAccountId,
            email: claims.email,
          });
          // A social provider vouching for the address is proof enough.
          await tx
            .update(users)
            .set({ emailVerifiedAt: new Date() })
            .where(and(eq(users.id, existing.id), isNull(users.emailVerifiedAt)));
          return { userId: existing.id, created: false, linked: true };
        }
      }

      // 3. A new account.
      const [user] = await tx
        .insert(users)
        .values({
          type: 'patient',
          status: 'active',
          email: claims.email,
          emailVerifiedAt: claims.email && claims.emailVerified ? new Date() : null,
          firstName: claims.firstName,
          lastName: claims.lastName,
        })
        .returning({ id: users.id });
      if (!user) throw ApiError.internal('Could not create the account.');

      await tx.insert(userIdentities).values({
        userId: user.id,
        provider,
        providerAccountId: claims.providerAccountId,
        email: claims.email,
      });

      // Signing in socially still makes them a patient, same as manual signup.
      await tx.insert(patients).values({
        userId: user.id,
        firstName: claims.firstName ?? 'Unknown',
        lastName: claims.lastName ?? 'Unknown',
        email: claims.email,
      });

      return { userId: user.id, created: true, linked: false };
    });

    const [user] = await withElevated(tx, () =>
      tx
        .select({ id: users.id, status: users.status, type: users.type })
        .from(users)
        .where(eq(users.id, resolved.userId))
        .limit(1),
    );
    if (!user) throw ApiError.internal('Could not resolve the account.');
    if (user.status !== 'active') throw ApiError.forbidden('This account is not active.');
    assertRoleMatches(claims.role, user.type, 'Could not sign in with that account.');

    await assumeUser(tx, user.id);
    const session = await issueSession(tx, {
      userId: user.id,
      ipAddress: ctx.ipAddress,
      userAgent: ctx.userAgent,
      deviceToken: claims.deviceToken ?? null,
      deviceType: claims.deviceType ?? null,
    });
    await tx.update(users).set({ lastSeenAt: new Date() }).where(eq(users.id, user.id));

    await recordAudit(
      tx,
      { ...ctx, session: ctx.session ?? emptySession(user.id, user.type) },
      {
        action: resolved.created ? 'auth.signed_up' : 'auth.signed_in',
        resourceType: 'user',
        resourceId: user.id,
        metadata: { method: provider, linked: resolved.linked },
      },
    );

    return {
      body: {
        user_id: user.id,
        user_type: user.type,
        signed_in: true,
        is_new_account: resolved.created,
        linked_to_existing: resolved.linked,
      },
      session,
    };
  },

  async listMfaFactors(tx: Tx, ctx: RequestContext): Promise<unknown> {
    return notImplemented('authService.listMfaFactors');
  },

  async enrollMfa(tx: Tx, ctx: RequestContext, body: unknown): Promise<unknown> {
    return notImplemented('authService.enrollMfa');
  },
};

// --- helpers ---------------------------------------------------------------

/**
 * Looks a user up by the address a code went to. Runs elevated: the caller
 * is usually anonymous, and the users policy is right to refuse them.
 */
/**
 * Refuses a sign-in aimed at the wrong interface.
 *
 * Office staff share the practice interface with clinicians, so `provider`
 * covers both. Internal (Control Center) accounts are neither and must sign
 * in through their own entrance.
 *
 * Omitting the role skips the check -- a client that does not care which
 * interface it lands on is served by `user_type` in the response.
 *
 * The caller supplies the message, and every caller passes the same one it
 * uses for bad credentials. A wrong entrance is then indistinguishable from a
 * wrong password: the response never confirms that an account exists, nor
 * which kind it is.
 */
const ROLE_ALLOWS: Record<InterfaceRole, readonly UserType[]> = {
  patient: ['patient'],
  provider: ['provider', 'staff'],
};

function assertRoleMatches(
  requested: InterfaceRole | undefined,
  actual: UserType,
  message: string,
): void {
  if (!requested) return;
  if (ROLE_ALLOWS[requested].includes(actual)) return;
  throw ApiError.forbidden(message);
}

interface AccountRow {
  id: string;
  status: string;
  type: UserType;
  phone: string | null;
  phoneVerifiedAt: Date | null;
  email: string | null;
  emailVerifiedAt: Date | null;
}

const accountColumns = {
  id: users.id,
  status: users.status,
  type: users.type,
  phone: users.phone,
  phoneVerifiedAt: users.phoneVerifiedAt,
  email: users.email,
  emailVerifiedAt: users.emailVerifiedAt,
};

async function findUserById(tx: Tx, id: string): Promise<AccountRow | null> {
  const rows = await withElevated(tx, () =>
    tx
      .select(accountColumns)
      .from(users)
      .where(and(eq(users.id, id), isNull(users.deletedAt)))
      .limit(1),
  );
  return rows[0] ?? null;
}

async function findUserByDestination(
  tx: Tx,
  channel: 'sms' | 'email',
  destination: string,
): Promise<AccountRow | null> {
  const rows = await withElevated(tx, () =>
    tx
      .select(accountColumns)
      .from(users)
      .where(
        and(
          channel === 'sms' ? eq(users.phone, destination) : eq(users.email, destination),
          isNull(users.deletedAt),
        ),
      )
      .limit(1),
  );
  return rows[0] ?? null;
}

async function deliverCode(input: {
  channel: 'sms' | 'email';
  destination: string;
  purpose: OtpPurpose;
  code: string;
  codeId: string;
}): Promise<{
  vendor: string;
  vendorMessageId: string | null;
  status: 'sent' | 'suppressed';
  devCode?: string;
}> {
  const { channel, destination, purpose, code, codeId } = input;
  const message = otpMessage(code, purpose);
  const adapter = channel === 'sms' ? telnyx : postmark;

  if (!adapter.isConfigured()) {
    /*
     * Echoing the code back to the caller is how local development works
     * without SMS or email credentials. Two independent conditions have to
     * agree before that happens: APP_ENV defaults to 'local', so on its own it
     * would echo codes from any deploy whose env was not filled in, while
     * NODE_ENV is set to 'production' by `next build`/`next start` and by
     * every host. Either one being wrong is now not enough.
     *
     * A staging deploy without the keys can opt in with SHOW_CODES_ON_SCREEN,
     * which env.ts refuses in production.
     */
    const localDev = env.APP_ENV === 'local' && process.env.NODE_ENV !== 'production';
    if (localDev || env.SHOW_CODES_ON_SCREEN) {
      logger.warn(
        { purpose, channel, destination: maskDestination(channel, destination), code },
        `OTP not delivered -- no ${adapter.vendor} credentials. Code echoed to the caller (${
          localDev ? 'local development' : 'SHOW_CODES_ON_SCREEN'
        }).`,
      );
      return { vendor: 'dev-console', vendorMessageId: null, status: 'suppressed', devCode: code };
    }
    throw new IntegrationNotConfiguredError(adapter.vendor);
  }

  if (channel === 'sms') {
    const { messageId } = await telnyx.sendSms({
      to: destination,
      body: message.text,
      idempotencyKey: `otp:${codeId}`,
    });
    return { vendor: 'telnyx', vendorMessageId: messageId, status: 'sent' };
  }

  const { messageId } = await postmark.send({
    to: destination,
    subject: message.subject,
    textBody: message.text,
    messageStream: 'security',
    tag: `otp-${purpose}`,
  });
  return { vendor: 'postmark', vendorMessageId: messageId, status: 'sent' };
}

function maskDestination(channel: 'sms' | 'email', destination: string): string {
  if (channel === 'sms') {
    const keep = 4;
    return destination.slice(0, 2) + '•'.repeat(Math.max(0, destination.length - 2 - keep)) + destination.slice(-keep);
  }
  const at = destination.indexOf('@');
  if (at <= 0) return '•••';
  const local = destination.slice(0, at);
  return `${local.slice(0, 1)}${'•'.repeat(Math.max(1, local.length - 1))}${destination.slice(at)}`;
}

function emptySession(userId: string, userType: 'patient' | 'staff' | 'provider' | 'internal') {
  return {
    sessionId: '',
    userId,
    userType,
    activeOrganizationId: null,
    activeFacilityId: null,
  };
}
