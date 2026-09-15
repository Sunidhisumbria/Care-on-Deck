import { pgEnum } from 'drizzle-orm/pg-core';

// --- Identity & access -----------------------------------------------------
export const userTypeEnum = pgEnum('user_type', [
  'patient',
  'staff', // office staff / organization member
  'provider',
  'internal', // CareOndeck employee (Control Center)
]);

/** IA: 14. Control Center > Account Status */
export const accountStatusEnum = pgEnum('account_status', [
  'active',
  'inactive',
  'suspended',
  'deactivated',
  'pending_review',
  'needs_changes',
  'approved',
  'rejected',
]);

export const identityProviderEnum = pgEnum('identity_provider', [
  'password',
  'google',
  'apple',
  'phone',
]);

export const mfaMethodEnum = pgEnum('mfa_method', ['sms', 'totp', 'email']);

// --- Organizations ---------------------------------------------------------
/** IA: 5. Office Onboarding > Select Office Type */
export const officeTypeEnum = pgEnum('office_type', [
  'dental',
  'medical',
  'specialist',
  'imaging_center',
  'urgent_care',
  'other',
]);

export const membershipScopeEnum = pgEnum('membership_scope', ['organization', 'facility']);

// --- Scheduling & appointments --------------------------------------------
/** IA: 7. Scheduling > Appointment Duration */
export const appointmentDurationEnum = pgEnum('appointment_duration', [
  'min_15',
  'min_30',
  'min_60',
  'min_90',
  'min_120',
]);

/**
 * `rescheduled` means SUPERSEDED: this appointment was replaced by a newer one
 * that points back at it through `rescheduled_from_id`. It therefore releases
 * its slot -- see the exclusion constraint in drizzle/sql/rls.sql.
 */
export const appointmentStatusEnum = pgEnum('appointment_status', [
  'requested',
  'confirmed',
  'rescheduled',
  'checked_in',
  'completed',
  'cancelled',
  'no_show',
  'declined',
]);

/** IA: 13. Reports > Appointments Report > Booking Source */
export const bookingSourceEnum = pgEnum('booking_source', [
  'marketplace', // 1. Public Marketplace
  'direct', // 8. Direct (private page / website embed)
  'pulse', // 9. Pulse (paid campaign)
  'staff', // entered by office staff
  'import', // OpenDental sync
]);

export const visitTypeEnum = pgEnum('visit_type', [
  'new_patient',
  'returning_patient',
  'consultation',
  'emergency',
  'follow_up',
  'procedure',
]);

/** IA: 7. Scheduling > Booking Holds */
export const bookingHoldScopeEnum = pgEnum('booking_hold_scope', [
  'today',
  'this_week',
  'this_month',
  'custom',
]);

export const scheduleChangeKindEnum = pgEnum('schedule_change_kind', [
  'drag_and_drop',
  'copy_day',
  'paste_day',
  'copy_week',
  'paste_week',
  'template_apply',
]);

// --- Moderation & approvals ------------------------------------------------
/** IA: 14. Control Center > Approvals */
export const approvalSubjectEnum = pgEnum('approval_subject', [
  'provider',
  'facility',
  'photo',
  'review',
]);

export const approvalStatusEnum = pgEnum('approval_status', [
  'pending_review',
  'needs_changes',
  'approved',
  'rejected',
]);

export const moderationStatusEnum = pgEnum('moderation_status', [
  'pending',
  'auto_approved',
  'auto_flagged',
  'approved',
  'rejected',
]);

/** IA: 14. Control Center > Provider Transfer */
export const transferKindEnum = pgEnum('transfer_kind', [
  'waiting_period',
  'early_release',
  'complete_transfer',
]);

export const transferStatusEnum = pgEnum('transfer_status', [
  'requested',
  'waiting_period',
  'released',
  'completed',
  'cancelled',
  'denied',
]);

// --- Billing ---------------------------------------------------------------
export const billingIntervalEnum = pgEnum('billing_interval', ['monthly', 'annual']);

/** IA: 14. Control Center > Pricing Configuration */
export const productLineEnum = pgEnum('product_line', [
  'marketplace',
  'direct',
  'pulse',
  'bundles',
  'add_ons',
  'sponsored_placement',
]);

export const subscriptionStatusEnum = pgEnum('subscription_status', [
  'trialing',
  'active',
  'past_due',
  'paused',
  'canceled',
  'incomplete',
]);

export const purchaseModeEnum = pgEnum('purchase_mode', ['buy_once', 'auto_replenish']);

export const invoiceStatusEnum = pgEnum('invoice_status', [
  'draft',
  'open',
  'paid',
  'uncollectible',
  'void',
]);

/** IA: 14. Control Center > Usage Tracking. One row per metered unit consumed. */
export const usageMeterEnum = pgEnum('usage_meter', [
  'sms',
  'email',
  'otp',
  'telnyx',
  'postmark',
  'amazon_ses',
  'stripe',
  'google_maps',
  'amazon_rekognition',
]);

export const creditReasonEnum = pgEnum('credit_reason', [
  'purchase',
  'bundle_grant',
  'auto_replenish',
  'plan_allowance',
  'consumption',
  'refund',
  'manual_adjustment',
  'expiry',
]);

// --- Notifications ---------------------------------------------------------
/** IA: 11. Notifications */
export const notificationCategoryEnum = pgEnum('notification_category', [
  'appointment_update',
  'billing_notice',
  'security_alert',
  'support_reply',
  'platform_announcement',
  'action_item',
]);

export const notificationChannelEnum = pgEnum('notification_channel', [
  'in_app',
  'email',
  'sms',
  'push',
]);

export const messageStatusEnum = pgEnum('message_status', [
  'queued',
  'sent',
  'delivered',
  'bounced',
  'failed',
  'suppressed',
]);

// --- Pulse -----------------------------------------------------------------
export const campaignStatusEnum = pgEnum('campaign_status', [
  'draft',
  'pending_review',
  'active',
  'paused',
  'completed',
  'archived',
]);

// --- Direct ----------------------------------------------------------------
/** IA: 8. Direct > Website Install > Install Status */
export const installStatusEnum = pgEnum('install_status', [
  'not_started',
  'code_copied',
  'detected',
  'verified',
  'done_for_you_requested',
  'done_for_you_complete',
]);

// --- Onboarding ------------------------------------------------------------
export const onboardingKindEnum = pgEnum('onboarding_kind', ['provider', 'office']);

export const onboardingStatusEnum = pgEnum('onboarding_status', [
  'in_progress',
  'submitted',
  'needs_changes',
  'approved',
  'rejected',
  'abandoned',
]);

// --- Verification ----------------------------------------------------------
export const verificationStatusEnum = pgEnum('verification_status', [
  'unverified',
  'pending',
  'verified',
  'failed',
  'expired',
]);

// --- Media -----------------------------------------------------------------
export const mediaKindEnum = pgEnum('media_kind', [
  'provider_headshot',
  'facility_photo',
  'logo',
  'license_document',
  'insurance_card',
  'report_export',
  'other',
]);

// --- Reports ---------------------------------------------------------------
export const reportKindEnum = pgEnum('report_kind', [
  'appointments',
  'facility',
  'provider',
  'organization',
  'pulse',
  'usage',
  'campaign',
]);

export const exportFormatEnum = pgEnum('export_format', ['csv', 'pdf']);

export const exportStatusEnum = pgEnum('export_status', [
  'queued',
  'processing',
  'ready',
  'failed',
  'expired',
]);

// --- Integrations ----------------------------------------------------------
export const integrationProviderEnum = pgEnum('integration_provider', [
  'opendental',
  'stripe',
  'typesense',
  'telnyx',
  'postmark',
  'amazon_ses',
  'amazon_rekognition',
  'google_maps',
  'nppes',
  'firebase_auth',
]);

export const integrationStatusEnum = pgEnum('integration_status', [
  'disconnected',
  'connected',
  'error',
  'syncing',
]);
