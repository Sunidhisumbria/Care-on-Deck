CREATE TYPE "public"."account_status" AS ENUM('active', 'inactive', 'suspended', 'deactivated', 'pending_review', 'needs_changes', 'approved', 'rejected');--> statement-breakpoint
CREATE TYPE "public"."appointment_duration" AS ENUM('min_15', 'min_30', 'min_60', 'min_90', 'min_120');--> statement-breakpoint
CREATE TYPE "public"."appointment_status" AS ENUM('requested', 'confirmed', 'rescheduled', 'checked_in', 'completed', 'cancelled', 'no_show', 'declined');--> statement-breakpoint
CREATE TYPE "public"."approval_status" AS ENUM('pending_review', 'needs_changes', 'approved', 'rejected');--> statement-breakpoint
CREATE TYPE "public"."approval_subject" AS ENUM('provider', 'facility', 'photo', 'review');--> statement-breakpoint
CREATE TYPE "public"."billing_interval" AS ENUM('monthly', 'annual');--> statement-breakpoint
CREATE TYPE "public"."booking_hold_scope" AS ENUM('today', 'this_week', 'this_month', 'custom');--> statement-breakpoint
CREATE TYPE "public"."booking_source" AS ENUM('marketplace', 'direct', 'pulse', 'staff', 'import');--> statement-breakpoint
CREATE TYPE "public"."campaign_status" AS ENUM('draft', 'pending_review', 'active', 'paused', 'completed', 'archived');--> statement-breakpoint
CREATE TYPE "public"."credit_reason" AS ENUM('purchase', 'bundle_grant', 'auto_replenish', 'plan_allowance', 'consumption', 'refund', 'manual_adjustment', 'expiry');--> statement-breakpoint
CREATE TYPE "public"."export_format" AS ENUM('csv', 'pdf');--> statement-breakpoint
CREATE TYPE "public"."export_status" AS ENUM('queued', 'processing', 'ready', 'failed', 'expired');--> statement-breakpoint
CREATE TYPE "public"."identity_provider" AS ENUM('password', 'google', 'apple', 'phone');--> statement-breakpoint
CREATE TYPE "public"."install_status" AS ENUM('not_started', 'code_copied', 'detected', 'verified', 'done_for_you_requested', 'done_for_you_complete');--> statement-breakpoint
CREATE TYPE "public"."integration_provider" AS ENUM('opendental', 'stripe', 'typesense', 'telnyx', 'postmark', 'amazon_ses', 'amazon_rekognition', 'google_maps', 'nppes', 'firebase_auth');--> statement-breakpoint
CREATE TYPE "public"."integration_status" AS ENUM('disconnected', 'connected', 'error', 'syncing');--> statement-breakpoint
CREATE TYPE "public"."invoice_status" AS ENUM('draft', 'open', 'paid', 'uncollectible', 'void');--> statement-breakpoint
CREATE TYPE "public"."media_kind" AS ENUM('provider_headshot', 'facility_photo', 'logo', 'license_document', 'insurance_card', 'report_export', 'other');--> statement-breakpoint
CREATE TYPE "public"."membership_scope" AS ENUM('organization', 'facility');--> statement-breakpoint
CREATE TYPE "public"."message_status" AS ENUM('queued', 'sent', 'delivered', 'bounced', 'failed', 'suppressed');--> statement-breakpoint
CREATE TYPE "public"."mfa_method" AS ENUM('sms', 'totp', 'email');--> statement-breakpoint
CREATE TYPE "public"."moderation_status" AS ENUM('pending', 'auto_approved', 'auto_flagged', 'approved', 'rejected');--> statement-breakpoint
CREATE TYPE "public"."notification_category" AS ENUM('appointment_update', 'billing_notice', 'security_alert', 'support_reply', 'platform_announcement', 'action_item');--> statement-breakpoint
CREATE TYPE "public"."notification_channel" AS ENUM('in_app', 'email', 'sms', 'push');--> statement-breakpoint
CREATE TYPE "public"."office_type" AS ENUM('dental', 'medical', 'specialist', 'imaging_center', 'urgent_care', 'other');--> statement-breakpoint
CREATE TYPE "public"."onboarding_kind" AS ENUM('provider', 'office');--> statement-breakpoint
CREATE TYPE "public"."onboarding_status" AS ENUM('in_progress', 'submitted', 'needs_changes', 'approved', 'rejected', 'abandoned');--> statement-breakpoint
CREATE TYPE "public"."product_line" AS ENUM('marketplace', 'direct', 'pulse', 'bundles', 'add_ons', 'sponsored_placement');--> statement-breakpoint
CREATE TYPE "public"."purchase_mode" AS ENUM('buy_once', 'auto_replenish');--> statement-breakpoint
CREATE TYPE "public"."report_kind" AS ENUM('appointments', 'facility', 'provider', 'organization', 'pulse', 'usage', 'campaign');--> statement-breakpoint
CREATE TYPE "public"."schedule_change_kind" AS ENUM('drag_and_drop', 'copy_day', 'paste_day', 'copy_week', 'paste_week', 'template_apply');--> statement-breakpoint
CREATE TYPE "public"."subscription_status" AS ENUM('trialing', 'active', 'past_due', 'paused', 'canceled', 'incomplete');--> statement-breakpoint
CREATE TYPE "public"."transfer_kind" AS ENUM('waiting_period', 'early_release', 'complete_transfer');--> statement-breakpoint
CREATE TYPE "public"."transfer_status" AS ENUM('requested', 'waiting_period', 'released', 'completed', 'cancelled', 'denied');--> statement-breakpoint
CREATE TYPE "public"."usage_meter" AS ENUM('sms', 'email', 'otp', 'telnyx', 'postmark', 'amazon_ses', 'stripe', 'google_maps', 'amazon_rekognition');--> statement-breakpoint
CREATE TYPE "public"."user_type" AS ENUM('patient', 'staff', 'provider', 'internal');--> statement-breakpoint
CREATE TYPE "public"."verification_status" AS ENUM('unverified', 'pending', 'verified', 'failed', 'expired');--> statement-breakpoint
CREATE TYPE "public"."visit_type" AS ENUM('new_patient', 'returning_patient', 'consultation', 'emergency', 'follow_up', 'procedure');--> statement-breakpoint
CREATE TABLE "mfa_factors" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"method" "mfa_method" NOT NULL,
	"secret_encrypted" text,
	"destination" varchar(320),
	"status" "verification_status" DEFAULT 'pending' NOT NULL,
	"confirmed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "rate_limit_buckets" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"key_hash" varchar(64) NOT NULL,
	"window_start" timestamp with time zone NOT NULL,
	"count" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sessions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"token_hash" varchar(128) NOT NULL,
	"active_organization_id" uuid,
	"active_facility_id" uuid,
	"ip_address" "inet",
	"user_agent" text,
	"expires_at" timestamp with time zone NOT NULL,
	"revoked_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "sessions_token_hash_unique" UNIQUE("token_hash")
);
--> statement-breakpoint
CREATE TABLE "trusted_devices" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"device_fingerprint" varchar(128) NOT NULL,
	"label" varchar(120),
	"last_ip" "inet",
	"last_used_at" timestamp with time zone,
	"trusted_until" timestamp with time zone NOT NULL,
	"revoked_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "user_identities" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"provider" "identity_provider" NOT NULL,
	"provider_account_id" varchar(255) NOT NULL,
	"email" varchar(320),
	"raw" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"firebase_uid" varchar(128),
	"type" "user_type" NOT NULL,
	"status" "account_status" DEFAULT 'active' NOT NULL,
	"email" varchar(320),
	"email_verified_at" timestamp with time zone,
	"phone" varchar(20),
	"phone_verified_at" timestamp with time zone,
	"first_name" varchar(100),
	"last_name" varchar(100),
	"avatar_url" text,
	"locale" varchar(10) DEFAULT 'en-US' NOT NULL,
	"timezone" varchar(64) DEFAULT 'America/New_York' NOT NULL,
	"mfa_enabled" boolean DEFAULT false NOT NULL,
	"last_seen_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	CONSTRAINT "users_firebase_uid_unique" UNIQUE("firebase_uid")
);
--> statement-breakpoint
CREATE TABLE "verification_codes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid,
	"purpose" varchar(40) NOT NULL,
	"destination" varchar(320) NOT NULL,
	"code_hash" varchar(128) NOT NULL,
	"attempts" integer DEFAULT 0 NOT NULL,
	"max_attempts" integer DEFAULT 5 NOT NULL,
	"consumed_at" timestamp with time zone,
	"completed_at" timestamp with time zone,
	"expires_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "facilities" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"name" varchar(200) NOT NULL,
	"slug" varchar(140) NOT NULL,
	"status" "account_status" DEFAULT 'pending_review' NOT NULL,
	"office_type" "office_type" DEFAULT 'other' NOT NULL,
	"address_line1" varchar(200),
	"address_line2" varchar(200),
	"city" varchar(120),
	"state" varchar(2),
	"postal_code" varchar(12),
	"country_code" varchar(2) DEFAULT 'US' NOT NULL,
	"google_place_id" varchar(255),
	"latitude" double precision,
	"longitude" double precision,
	"timezone" varchar(64) DEFAULT 'America/New_York' NOT NULL,
	"phone" varchar(20),
	"email" varchar(320),
	"practice_style" varchar(60),
	"about" text,
	"rating_average" double precision,
	"rating_count" double precision DEFAULT 0 NOT NULL,
	"is_publicly_listed" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "facility_services" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"facility_id" uuid NOT NULL,
	"specialty_id" uuid,
	"name" varchar(160) NOT NULL,
	"description" text,
	"metadata" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "memberships" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"organization_id" uuid NOT NULL,
	"scope" "membership_scope" DEFAULT 'organization' NOT NULL,
	"facility_id" uuid,
	"role_id" uuid NOT NULL,
	"status" "account_status" DEFAULT 'active' NOT NULL,
	"title" varchar(120),
	"invited_by_user_id" uuid,
	"invited_at" timestamp with time zone,
	"accepted_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "organizations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(200) NOT NULL,
	"slug" varchar(120) NOT NULL,
	"office_type" "office_type" DEFAULT 'other' NOT NULL,
	"status" "account_status" DEFAULT 'pending_review' NOT NULL,
	"legal_name" varchar(200),
	"tax_id" varchar(32),
	"group_npi" varchar(10),
	"website" text,
	"support_email" varchar(320),
	"support_phone" varchar(20),
	"stripe_customer_id" varchar(64),
	"owner_user_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	CONSTRAINT "organizations_slug_unique" UNIQUE("slug"),
	CONSTRAINT "organizations_stripe_customer_id_unique" UNIQUE("stripe_customer_id")
);
--> statement-breakpoint
CREATE TABLE "permissions" (
	"key" varchar(80) PRIMARY KEY NOT NULL,
	"resource" varchar(60) NOT NULL,
	"action" varchar(40) NOT NULL,
	"description" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "role_permissions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"role_id" uuid NOT NULL,
	"permission_key" varchar(80) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "roles" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid,
	"key" varchar(60) NOT NULL,
	"name" varchar(120) NOT NULL,
	"description" text,
	"is_system" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "roles_scope_key_unique" UNIQUE NULLS NOT DISTINCT("organization_id","key")
);
--> statement-breakpoint
CREATE TABLE "specialties" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"key" varchar(80) NOT NULL,
	"name" varchar(140) NOT NULL,
	"taxonomy_code" varchar(20),
	"parent_id" uuid,
	"seo_slug" varchar(140),
	"seo_title" varchar(200),
	"seo_description" text,
	"hero_image_url" text,
	"display_order" double precision DEFAULT 0 NOT NULL,
	"is_featured" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "specialties_key_unique" UNIQUE("key"),
	CONSTRAINT "specialties_seo_slug_unique" UNIQUE("seo_slug")
);
--> statement-breakpoint
CREATE TABLE "provider_facilities" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"provider_id" uuid NOT NULL,
	"facility_id" uuid NOT NULL,
	"is_primary" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "provider_licenses" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"provider_id" uuid NOT NULL,
	"state" varchar(2) NOT NULL,
	"license_number" varchar(60) NOT NULL,
	"issued_on" date,
	"expires_on" date,
	"status" "verification_status" DEFAULT 'pending' NOT NULL,
	"verified_by_user_id" uuid,
	"verified_at" timestamp with time zone,
	"document_media_id" uuid,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "provider_specialties" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"provider_id" uuid NOT NULL,
	"specialty_id" uuid NOT NULL,
	"is_primary" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "providers" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"user_id" uuid,
	"status" "account_status" DEFAULT 'pending_review' NOT NULL,
	"npi" varchar(10),
	"npi_verification_status" "verification_status" DEFAULT 'unverified' NOT NULL,
	"npi_verified_at" timestamp with time zone,
	"npi_registry_snapshot" jsonb,
	"first_name" varchar(100) NOT NULL,
	"middle_name" varchar(100),
	"last_name" varchar(100) NOT NULL,
	"credentials" varchar(60),
	"display_name" varchar(220),
	"slug" varchar(160),
	"gender" varchar(20),
	"languages" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"bio" text,
	"headshot_media_id" uuid,
	"years_experience" integer,
	"rating_average" double precision,
	"rating_count" integer DEFAULT 0 NOT NULL,
	"is_publicly_listed" boolean DEFAULT false NOT NULL,
	"accepting_new_patients" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "patient_addresses" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"patient_id" uuid NOT NULL,
	"label" varchar(60),
	"address_line1" varchar(200) NOT NULL,
	"address_line2" varchar(200),
	"city" varchar(120) NOT NULL,
	"state" varchar(2) NOT NULL,
	"postal_code" varchar(12) NOT NULL,
	"country_code" varchar(2) DEFAULT 'US' NOT NULL,
	"google_place_id" varchar(255),
	"is_default" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "patient_dependents" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"guardian_patient_id" uuid NOT NULL,
	"dependent_patient_id" uuid NOT NULL,
	"guardian_user_id" uuid,
	"relationship" varchar(40) NOT NULL,
	"can_book_on_behalf" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "patient_facility_records" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"facility_id" uuid NOT NULL,
	"patient_id" uuid NOT NULL,
	"external_system" varchar(40) NOT NULL,
	"external_patient_id" varchar(80) NOT NULL,
	"last_synced_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "patient_insurance" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"patient_id" uuid NOT NULL,
	"carrier_id" uuid,
	"plan_id" uuid,
	"carrier_name_raw" varchar(200),
	"member_id_encrypted" text,
	"group_number_encrypted" text,
	"member_id_last4" varchar(4),
	"subscriber_name" varchar(200),
	"subscriber_relationship" varchar(40),
	"subscriber_date_of_birth" date,
	"card_front_media_id" uuid,
	"card_back_media_id" uuid,
	"is_primary" boolean DEFAULT true NOT NULL,
	"effective_on" date,
	"expires_on" date,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "patients" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid,
	"status" "account_status" DEFAULT 'active' NOT NULL,
	"first_name" varchar(100) NOT NULL,
	"middle_name" varchar(100),
	"last_name" varchar(100) NOT NULL,
	"preferred_name" varchar(100),
	"date_of_birth" date,
	"gender" varchar(20),
	"languages" jsonb,
	"email" varchar(320),
	"phone" varchar(20),
	"is_guest_record" boolean DEFAULT false NOT NULL,
	"merged_into_patient_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "facility_accepted_plans" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"facility_id" uuid NOT NULL,
	"carrier_id" uuid NOT NULL,
	"plan_id" uuid,
	"is_in_network" boolean DEFAULT true NOT NULL,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "facility_accepted_plans_unique" UNIQUE NULLS NOT DISTINCT("facility_id","carrier_id","plan_id")
);
--> statement-breakpoint
CREATE TABLE "insurance_aliases" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"carrier_id" uuid,
	"plan_id" uuid,
	"alias" varchar(200) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "insurance_carriers" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(200) NOT NULL,
	"slug" varchar(160) NOT NULL,
	"payer_id" varchar(40),
	"logo_url" text,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "insurance_carriers_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "insurance_plans" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"carrier_id" uuid NOT NULL,
	"name" varchar(200) NOT NULL,
	"slug" varchar(160) NOT NULL,
	"plan_type" varchar(40),
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "insurance_regions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"carrier_id" uuid NOT NULL,
	"plan_id" uuid,
	"state" varchar(2) NOT NULL,
	"county_fips" varchar(5),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "insurance_regions_unique" UNIQUE NULLS NOT DISTINCT("carrier_id","plan_id","state","county_fips")
);
--> statement-breakpoint
CREATE TABLE "provider_accepted_plans" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"provider_id" uuid NOT NULL,
	"carrier_id" uuid NOT NULL,
	"plan_id" uuid,
	"is_in_network" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "provider_accepted_plans_unique" UNIQUE NULLS NOT DISTINCT("provider_id","carrier_id","plan_id")
);
--> statement-breakpoint
CREATE TABLE "availability_overrides" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"facility_id" uuid NOT NULL,
	"provider_id" uuid,
	"on_date" date NOT NULL,
	"is_available" boolean DEFAULT false NOT NULL,
	"start_time" time,
	"end_time" time,
	"reason" varchar(200),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "availability_rules" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"facility_id" uuid NOT NULL,
	"provider_id" uuid,
	"weekday" smallint NOT NULL,
	"start_time" time NOT NULL,
	"end_time" time NOT NULL,
	"slot_interval_minutes" smallint DEFAULT 15 NOT NULL,
	"capacity" smallint DEFAULT 1 NOT NULL,
	"effective_from" date,
	"effective_to" date,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "booking_holds" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"facility_id" uuid NOT NULL,
	"provider_id" uuid,
	"scope" "booking_hold_scope" NOT NULL,
	"starts_at" timestamp with time zone NOT NULL,
	"ends_at" timestamp with time zone NOT NULL,
	"reason" varchar(200),
	"created_by_user_id" uuid,
	"released_at" timestamp with time zone,
	"released_by_user_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "provider_visit_reasons" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"provider_id" uuid NOT NULL,
	"visit_reason_id" uuid NOT NULL,
	"duration_minutes_override" smallint,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "schedule_change_sets" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"facility_id" uuid NOT NULL,
	"provider_id" uuid,
	"kind" "schedule_change_kind" NOT NULL,
	"operations" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"conflicts" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"created_by_user_id" uuid,
	"confirmed_at" timestamp with time zone,
	"discarded_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "schedule_templates" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"facility_id" uuid,
	"name" varchar(160) NOT NULL,
	"description" text,
	"blocks" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"created_by_user_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "visit_reasons" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"facility_id" uuid,
	"name" varchar(160) NOT NULL,
	"description" text,
	"visit_type" "visit_type" DEFAULT 'new_patient' NOT NULL,
	"duration_minutes" smallint DEFAULT 30 NOT NULL,
	"buffer_minutes" smallint DEFAULT 0 NOT NULL,
	"requires_insurance" boolean DEFAULT false NOT NULL,
	"is_bookable_online" boolean DEFAULT true NOT NULL,
	"display_order" integer DEFAULT 0 NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "appointment_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"appointment_id" uuid NOT NULL,
	"kind" varchar(40) NOT NULL,
	"from_status" "appointment_status",
	"to_status" "appointment_status",
	"actor_user_id" uuid,
	"actor_system" varchar(40),
	"payload" jsonb,
	"occurred_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "appointments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"reference" varchar(16) NOT NULL,
	"organization_id" uuid NOT NULL,
	"facility_id" uuid NOT NULL,
	"provider_id" uuid,
	"patient_id" uuid NOT NULL,
	"patient_user_id" uuid,
	"visit_reason_id" uuid,
	"status" "appointment_status" DEFAULT 'requested' NOT NULL,
	"source" "booking_source" NOT NULL,
	"visit_type" "visit_type" DEFAULT 'new_patient' NOT NULL,
	"starts_at" timestamp with time zone NOT NULL,
	"ends_at" timestamp with time zone NOT NULL,
	"duration_minutes" smallint NOT NULL,
	"requested_at" timestamp with time zone DEFAULT now() NOT NULL,
	"confirmed_at" timestamp with time zone,
	"checked_in_at" timestamp with time zone,
	"completed_at" timestamp with time zone,
	"cancelled_at" timestamp with time zone,
	"cancellation_reason" text,
	"cancelled_by_user_id" uuid,
	"is_no_show" boolean DEFAULT false NOT NULL,
	"no_show_marked_at" timestamp with time zone,
	"rescheduled_from_id" uuid,
	"patient_note" text,
	"staff_note" text,
	"patient_insurance_id" uuid,
	"insurance_carrier_name" varchar(200),
	"patient_snapshot" jsonb,
	"direct_page_id" uuid,
	"campaign_id" uuid,
	"attribution" jsonb,
	"external_system" varchar(40),
	"external_appointment_id" varchar(80),
	"external_synced_at" timestamp with time zone,
	"created_by_user_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	CONSTRAINT "appointments_reference_unique" UNIQUE("reference")
);
--> statement-breakpoint
CREATE TABLE "reviews" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"appointment_id" uuid NOT NULL,
	"facility_id" uuid NOT NULL,
	"provider_id" uuid,
	"patient_id" uuid NOT NULL,
	"rating" smallint NOT NULL,
	"title" varchar(200),
	"body" text,
	"is_verified_visit" boolean DEFAULT true NOT NULL,
	"is_published" boolean DEFAULT false NOT NULL,
	"published_at" timestamp with time zone,
	"response_body" text,
	"response_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "direct_installs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"direct_page_id" uuid NOT NULL,
	"embed_key" varchar(48) NOT NULL,
	"allowed_origins" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"status" "install_status" DEFAULT 'not_started' NOT NULL,
	"first_seen_at" timestamp with time zone,
	"last_seen_at" timestamp with time zone,
	"detected_url" text,
	"done_for_you_requested_at" timestamp with time zone,
	"done_for_you_completed_at" timestamp with time zone,
	"done_for_you_assignee_user_id" uuid,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "direct_installs_embed_key_unique" UNIQUE("embed_key")
);
--> statement-breakpoint
CREATE TABLE "direct_page_providers" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"direct_page_id" uuid NOT NULL,
	"provider_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "direct_pages" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"facility_id" uuid,
	"slug" varchar(140) NOT NULL,
	"private_token" varchar(48) NOT NULL,
	"is_published" boolean DEFAULT false NOT NULL,
	"branding" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"flow_config" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	CONSTRAINT "direct_pages_slug_unique" UNIQUE("slug"),
	CONSTRAINT "direct_pages_private_token_unique" UNIQUE("private_token")
);
--> statement-breakpoint
CREATE TABLE "agencies" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(200) NOT NULL,
	"slug" varchar(160) NOT NULL,
	"status" "account_status" DEFAULT 'pending_review' NOT NULL,
	"contact_name" varchar(200),
	"contact_email" varchar(320),
	"contact_phone" varchar(20),
	"website" text,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	CONSTRAINT "agencies_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "agency_clients" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"agency_id" uuid NOT NULL,
	"organization_id" uuid NOT NULL,
	"status" "account_status" DEFAULT 'active' NOT NULL,
	"started_on" date,
	"ended_on" date,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "agency_engagements" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"agency_id" uuid NOT NULL,
	"organization_id" uuid,
	"kind" varchar(40) NOT NULL,
	"summary" text,
	"actor_user_id" uuid,
	"occurred_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "campaign_clicks" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"campaign_id" uuid NOT NULL,
	"tracking_link_id" uuid,
	"visitor_id" varchar(48),
	"referrer" text,
	"user_agent" text,
	"ip_address" "inet",
	"country_code" varchar(2),
	"is_billable" boolean DEFAULT true NOT NULL,
	"occurred_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "campaign_daily_metrics" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"campaign_id" uuid NOT NULL,
	"on_date" date NOT NULL,
	"impressions" integer DEFAULT 0 NOT NULL,
	"clicks" integer DEFAULT 0 NOT NULL,
	"appointment_requests" integer DEFAULT 0 NOT NULL,
	"confirmed_appointments" integer DEFAULT 0 NOT NULL,
	"completed_appointments" integer DEFAULT 0 NOT NULL,
	"spend_cents" bigint DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "campaign_tracking_links" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"campaign_id" uuid NOT NULL,
	"code" varchar(24) NOT NULL,
	"destination_url" text NOT NULL,
	"label" varchar(140),
	"utm" jsonb,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "campaign_tracking_links_code_unique" UNIQUE("code")
);
--> statement-breakpoint
CREATE TABLE "campaigns" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"facility_id" uuid,
	"agency_id" uuid,
	"name" varchar(200) NOT NULL,
	"status" "campaign_status" DEFAULT 'draft' NOT NULL,
	"target_specialty_id" uuid,
	"target_provider_id" uuid,
	"target_radius_miles" integer,
	"target_postal_codes" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"total_budget_cents" integer,
	"daily_budget_cents" integer,
	"cost_per_appointment_cents" integer,
	"is_sponsored_placement" boolean DEFAULT false NOT NULL,
	"starts_on" date,
	"ends_on" date,
	"created_by_user_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "addons" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"key" varchar(60) NOT NULL,
	"name" varchar(140) NOT NULL,
	"description" text,
	"product_line" "product_line" NOT NULL,
	"price_cents" integer NOT NULL,
	"currency" varchar(3) DEFAULT 'USD' NOT NULL,
	"grants_credits" integer DEFAULT 0 NOT NULL,
	"supports_auto_replenish" boolean DEFAULT false NOT NULL,
	"stripe_price_id" varchar(64),
	"is_active" boolean DEFAULT true NOT NULL,
	"display_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "addons_key_unique" UNIQUE("key")
);
--> statement-breakpoint
CREATE TABLE "billing_plans" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"key" varchar(60) NOT NULL,
	"name" varchar(140) NOT NULL,
	"description" text,
	"product_line" "product_line" NOT NULL,
	"interval" "billing_interval" NOT NULL,
	"price_cents" integer NOT NULL,
	"currency" varchar(3) DEFAULT 'USD' NOT NULL,
	"included_credits" integer DEFAULT 0 NOT NULL,
	"entitlements" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"stripe_price_id" varchar(64),
	"is_publicly_listed" boolean DEFAULT true NOT NULL,
	"display_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	CONSTRAINT "billing_plans_key_unique" UNIQUE("key")
);
--> statement-breakpoint
CREATE TABLE "bundle_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"bundle_id" uuid NOT NULL,
	"plan_id" uuid,
	"addon_id" uuid,
	"quantity" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "bundles" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"key" varchar(60) NOT NULL,
	"name" varchar(140) NOT NULL,
	"description" text,
	"price_cents" integer NOT NULL,
	"currency" varchar(3) DEFAULT 'USD' NOT NULL,
	"stripe_price_id" varchar(64),
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "bundles_key_unique" UNIQUE("key")
);
--> statement-breakpoint
CREATE TABLE "credit_ledger" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"delta" integer NOT NULL,
	"balance_after" integer NOT NULL,
	"reason" "credit_reason" NOT NULL,
	"meter" "usage_meter",
	"usage_event_id" uuid,
	"addon_id" uuid,
	"invoice_id" uuid,
	"note" text,
	"actor_user_id" uuid,
	"expires_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "invoice_line_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"invoice_id" uuid NOT NULL,
	"description" varchar(300) NOT NULL,
	"product_line" "product_line",
	"quantity" numeric(12, 4) DEFAULT '1' NOT NULL,
	"unit_amount_cents" integer NOT NULL,
	"amount_cents" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "invoices" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"number" varchar(40),
	"status" "invoice_status" DEFAULT 'draft' NOT NULL,
	"subtotal_cents" integer DEFAULT 0 NOT NULL,
	"tax_cents" integer DEFAULT 0 NOT NULL,
	"total_cents" integer DEFAULT 0 NOT NULL,
	"amount_paid_cents" integer DEFAULT 0 NOT NULL,
	"currency" varchar(3) DEFAULT 'USD' NOT NULL,
	"period_start" timestamp with time zone,
	"period_end" timestamp with time zone,
	"due_at" timestamp with time zone,
	"paid_at" timestamp with time zone,
	"stripe_invoice_id" varchar(64),
	"hosted_invoice_url" text,
	"pdf_url" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "invoices_stripe_invoice_id_unique" UNIQUE("stripe_invoice_id")
);
--> statement-breakpoint
CREATE TABLE "payment_methods" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"stripe_payment_method_id" varchar(64) NOT NULL,
	"brand" varchar(40),
	"last4" varchar(4),
	"exp_month" integer,
	"exp_year" integer,
	"is_default" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	CONSTRAINT "payment_methods_stripe_payment_method_id_unique" UNIQUE("stripe_payment_method_id")
);
--> statement-breakpoint
CREATE TABLE "subscription_addons" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"subscription_id" uuid,
	"addon_id" uuid NOT NULL,
	"mode" "purchase_mode" DEFAULT 'buy_once' NOT NULL,
	"quantity" integer DEFAULT 1 NOT NULL,
	"replenish_threshold" integer,
	"replenish_quantity" integer,
	"last_replenished_at" timestamp with time zone,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "subscriptions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"plan_id" uuid NOT NULL,
	"bundle_id" uuid,
	"status" "subscription_status" DEFAULT 'trialing' NOT NULL,
	"interval" "billing_interval" NOT NULL,
	"quantity" integer DEFAULT 1 NOT NULL,
	"current_period_start" timestamp with time zone,
	"current_period_end" timestamp with time zone,
	"trial_ends_at" timestamp with time zone,
	"cancel_at_period_end" boolean DEFAULT false NOT NULL,
	"canceled_at" timestamp with time zone,
	"stripe_subscription_id" varchar(64),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "subscriptions_stripe_subscription_id_unique" UNIQUE("stripe_subscription_id")
);
--> statement-breakpoint
CREATE TABLE "usage_daily_rollups" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"on_date" date NOT NULL,
	"meter" "usage_meter" NOT NULL,
	"quantity" integer DEFAULT 0 NOT NULL,
	"credits_charged" integer DEFAULT 0 NOT NULL,
	"vendor_cost_micros" bigint DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "usage_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"facility_id" uuid,
	"meter" "usage_meter" NOT NULL,
	"quantity" integer DEFAULT 1 NOT NULL,
	"credits_charged" integer DEFAULT 0 NOT NULL,
	"vendor_cost_micros" bigint DEFAULT 0 NOT NULL,
	"external_reference" varchar(120),
	"metadata" jsonb,
	"occurred_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "announcements" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"title" varchar(200) NOT NULL,
	"body" text NOT NULL,
	"audience" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"publish_at" timestamp with time zone,
	"expires_at" timestamp with time zone,
	"created_by_user_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "notification_preferences" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"organization_id" uuid,
	"category" "notification_category" NOT NULL,
	"channel" "notification_channel" NOT NULL,
	"is_enabled" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "notification_preferences_unique" UNIQUE NULLS NOT DISTINCT("user_id","organization_id","category","channel")
);
--> statement-breakpoint
CREATE TABLE "notifications" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid,
	"recipient_user_id" uuid NOT NULL,
	"category" "notification_category" NOT NULL,
	"title" varchar(200) NOT NULL,
	"body" text,
	"action_url" text,
	"action_label" varchar(60),
	"requires_action" boolean DEFAULT false NOT NULL,
	"resolved_at" timestamp with time zone,
	"subject_type" varchar(40),
	"subject_id" uuid,
	"data" jsonb,
	"read_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "outbound_messages" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid,
	"recipient_user_id" uuid,
	"notification_id" uuid,
	"channel" "notification_channel" NOT NULL,
	"vendor" varchar(40) NOT NULL,
	"template_key" varchar(80),
	"destination" varchar(320) NOT NULL,
	"subject" varchar(300),
	"status" "message_status" DEFAULT 'queued' NOT NULL,
	"vendor_message_id" varchar(128),
	"attempts" integer DEFAULT 0 NOT NULL,
	"last_error" text,
	"sent_at" timestamp with time zone,
	"delivered_at" timestamp with time zone,
	"failed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "suppression_list" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"channel" "notification_channel" NOT NULL,
	"destination" varchar(320) NOT NULL,
	"reason" varchar(40) NOT NULL,
	"vendor" varchar(40),
	"expires_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "approval_requests" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid,
	"subject_type" "approval_subject" NOT NULL,
	"subject_id" uuid NOT NULL,
	"status" "approval_status" DEFAULT 'pending_review' NOT NULL,
	"submitted_by_user_id" uuid,
	"submitted_at" timestamp with time zone DEFAULT now() NOT NULL,
	"assigned_to_user_id" uuid,
	"decided_by_user_id" uuid,
	"decided_at" timestamp with time zone,
	"decision_note" text,
	"requested_changes" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "media_assets" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid,
	"facility_id" uuid,
	"uploaded_by_user_id" uuid,
	"kind" "media_kind" NOT NULL,
	"storage_key" text NOT NULL,
	"content_type" varchar(100) NOT NULL,
	"byte_size" bigint NOT NULL,
	"width" integer,
	"height" integer,
	"checksum_sha256" varchar(64),
	"moderation_status" "moderation_status" DEFAULT 'pending' NOT NULL,
	"moderation_labels" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"moderated_at" timestamp with time zone,
	"moderated_by_user_id" uuid,
	"moderation_note" text,
	"alt_text" varchar(300),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	CONSTRAINT "media_assets_storage_key_unique" UNIQUE("storage_key")
);
--> statement-breakpoint
CREATE TABLE "provider_transfers" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"provider_id" uuid NOT NULL,
	"current_organization_id" uuid NOT NULL,
	"current_facility_id" uuid,
	"target_organization_id" uuid NOT NULL,
	"target_facility_id" uuid,
	"kind" "transfer_kind" DEFAULT 'waiting_period' NOT NULL,
	"status" "transfer_status" DEFAULT 'requested' NOT NULL,
	"waiting_period_ends_on" date,
	"early_release_granted_by_user_id" uuid,
	"early_release_granted_at" timestamp with time zone,
	"appointment_handling" varchar(40) DEFAULT 'keep_with_facility' NOT NULL,
	"requested_by_user_id" uuid,
	"completed_at" timestamp with time zone,
	"reason" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "facility_settings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"facility_id" uuid NOT NULL,
	"booking" jsonb,
	"communications" jsonb,
	"opening_hours" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "facility_settings_facility_id_unique" UNIQUE("facility_id")
);
--> statement-breakpoint
CREATE TABLE "feature_flag_overrides" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"flag_id" uuid NOT NULL,
	"organization_id" uuid NOT NULL,
	"is_enabled" boolean NOT NULL,
	"note" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "feature_flags" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"key" varchar(80) NOT NULL,
	"description" text,
	"is_enabled_globally" boolean DEFAULT false NOT NULL,
	"rollout_percentage" smallint DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "feature_flags_key_unique" UNIQUE("key")
);
--> statement-breakpoint
CREATE TABLE "organization_settings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"require_mfa_for_staff" boolean DEFAULT false NOT NULL,
	"session_timeout_minutes" integer DEFAULT 480 NOT NULL,
	"trusted_device_days" smallint DEFAULT 30 NOT NULL,
	"allowed_ip_ranges" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"booking" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"communications" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"branding" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "organization_settings_organization_id_unique" UNIQUE("organization_id")
);
--> statement-breakpoint
CREATE TABLE "onboarding_sessions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"kind" "onboarding_kind" NOT NULL,
	"status" "onboarding_status" DEFAULT 'in_progress' NOT NULL,
	"user_id" uuid,
	"organization_id" uuid,
	"facility_id" uuid,
	"provider_id" uuid,
	"current_step" varchar(60) NOT NULL,
	"completed_steps" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"draft" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"submitted_at" timestamp with time zone,
	"approval_request_id" uuid,
	"reviewer_note" text,
	"last_active_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "report_exports" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"kind" "report_kind" NOT NULL,
	"format" "export_format" NOT NULL,
	"status" "export_status" DEFAULT 'queued' NOT NULL,
	"parameters" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"columns" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"contains_phi" boolean DEFAULT false NOT NULL,
	"row_count" integer,
	"byte_size" integer,
	"storage_key" text,
	"requested_by_user_id" uuid,
	"started_at" timestamp with time zone,
	"completed_at" timestamp with time zone,
	"failed_at" timestamp with time zone,
	"last_error" text,
	"expires_at" timestamp with time zone NOT NULL,
	"downloaded_at" timestamp with time zone,
	"download_count" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "saved_report_views" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"owner_user_id" uuid NOT NULL,
	"kind" "report_kind" NOT NULL,
	"name" varchar(160) NOT NULL,
	"parameters" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"is_shared" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "audit_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid,
	"actor_user_id" uuid,
	"actor_system" varchar(60),
	"actor_label" varchar(200),
	"action" varchar(80) NOT NULL,
	"resource_type" varchar(60) NOT NULL,
	"resource_id" uuid,
	"changes" jsonb,
	"metadata" jsonb,
	"ip_address" "inet",
	"user_agent" text,
	"request_id" varchar(64),
	"occurred_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "phi_access_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid,
	"actor_user_id" uuid,
	"patient_id" uuid NOT NULL,
	"access_kind" varchar(30) NOT NULL,
	"context" varchar(80) NOT NULL,
	"resource_id" uuid,
	"was_elevated" boolean DEFAULT false NOT NULL,
	"ip_address" "inet",
	"request_id" varchar(64),
	"occurred_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "webhook_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"vendor" varchar(40) NOT NULL,
	"event_type" varchar(120) NOT NULL,
	"external_event_id" varchar(160) NOT NULL,
	"payload" jsonb NOT NULL,
	"signature_verified" boolean DEFAULT false NOT NULL,
	"processed_at" timestamp with time zone,
	"failed_at" timestamp with time zone,
	"attempts" integer DEFAULT 0 NOT NULL,
	"last_error" text,
	"received_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "geocode_cache" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"cache_key" varchar(300) NOT NULL,
	"google_place_id" varchar(255),
	"formatted_address" text,
	"latitude" text,
	"longitude" text,
	"components" jsonb,
	"expires_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "geocode_cache_cache_key_unique" UNIQUE("cache_key")
);
--> statement-breakpoint
CREATE TABLE "integration_connections" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"facility_id" uuid,
	"provider" "integration_provider" NOT NULL,
	"status" "integration_status" DEFAULT 'disconnected' NOT NULL,
	"config" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"credentials_encrypted" text,
	"last_synced_at" timestamp with time zone,
	"last_error" text,
	"last_error_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "integration_connections_unique" UNIQUE NULLS NOT DISTINCT("organization_id","facility_id","provider")
);
--> statement-breakpoint
CREATE TABLE "integration_sync_runs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"connection_id" uuid NOT NULL,
	"operation" varchar(60) NOT NULL,
	"outcome" varchar(20) DEFAULT 'running' NOT NULL,
	"records_read" integer DEFAULT 0 NOT NULL,
	"records_written" integer DEFAULT 0 NOT NULL,
	"records_failed" integer DEFAULT 0 NOT NULL,
	"started_at" timestamp with time zone DEFAULT now() NOT NULL,
	"finished_at" timestamp with time zone,
	"error" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "search_index_jobs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"collection" varchar(40) NOT NULL,
	"document_id" uuid NOT NULL,
	"operation" varchar(10) NOT NULL,
	"attempts" integer DEFAULT 0 NOT NULL,
	"processed_at" timestamp with time zone,
	"failed_at" timestamp with time zone,
	"last_error" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "mfa_factors" ADD CONSTRAINT "mfa_factors_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "trusted_devices" ADD CONSTRAINT "trusted_devices_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_identities" ADD CONSTRAINT "user_identities_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "verification_codes" ADD CONSTRAINT "verification_codes_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "facilities" ADD CONSTRAINT "facilities_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "facility_services" ADD CONSTRAINT "facility_services_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "facility_services" ADD CONSTRAINT "facility_services_facility_id_facilities_id_fk" FOREIGN KEY ("facility_id") REFERENCES "public"."facilities"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "facility_services" ADD CONSTRAINT "facility_services_specialty_id_specialties_id_fk" FOREIGN KEY ("specialty_id") REFERENCES "public"."specialties"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "memberships" ADD CONSTRAINT "memberships_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "memberships" ADD CONSTRAINT "memberships_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "memberships" ADD CONSTRAINT "memberships_facility_id_facilities_id_fk" FOREIGN KEY ("facility_id") REFERENCES "public"."facilities"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "memberships" ADD CONSTRAINT "memberships_role_id_roles_id_fk" FOREIGN KEY ("role_id") REFERENCES "public"."roles"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "memberships" ADD CONSTRAINT "memberships_invited_by_user_id_users_id_fk" FOREIGN KEY ("invited_by_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "organizations" ADD CONSTRAINT "organizations_owner_user_id_users_id_fk" FOREIGN KEY ("owner_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "role_permissions" ADD CONSTRAINT "role_permissions_role_id_roles_id_fk" FOREIGN KEY ("role_id") REFERENCES "public"."roles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "role_permissions" ADD CONSTRAINT "role_permissions_permission_key_permissions_key_fk" FOREIGN KEY ("permission_key") REFERENCES "public"."permissions"("key") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "roles" ADD CONSTRAINT "roles_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "provider_facilities" ADD CONSTRAINT "provider_facilities_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "provider_facilities" ADD CONSTRAINT "provider_facilities_provider_id_providers_id_fk" FOREIGN KEY ("provider_id") REFERENCES "public"."providers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "provider_facilities" ADD CONSTRAINT "provider_facilities_facility_id_facilities_id_fk" FOREIGN KEY ("facility_id") REFERENCES "public"."facilities"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "provider_licenses" ADD CONSTRAINT "provider_licenses_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "provider_licenses" ADD CONSTRAINT "provider_licenses_provider_id_providers_id_fk" FOREIGN KEY ("provider_id") REFERENCES "public"."providers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "provider_licenses" ADD CONSTRAINT "provider_licenses_verified_by_user_id_users_id_fk" FOREIGN KEY ("verified_by_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "provider_specialties" ADD CONSTRAINT "provider_specialties_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "provider_specialties" ADD CONSTRAINT "provider_specialties_provider_id_providers_id_fk" FOREIGN KEY ("provider_id") REFERENCES "public"."providers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "provider_specialties" ADD CONSTRAINT "provider_specialties_specialty_id_specialties_id_fk" FOREIGN KEY ("specialty_id") REFERENCES "public"."specialties"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "providers" ADD CONSTRAINT "providers_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "providers" ADD CONSTRAINT "providers_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "patient_addresses" ADD CONSTRAINT "patient_addresses_patient_id_patients_id_fk" FOREIGN KEY ("patient_id") REFERENCES "public"."patients"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "patient_dependents" ADD CONSTRAINT "patient_dependents_guardian_patient_id_patients_id_fk" FOREIGN KEY ("guardian_patient_id") REFERENCES "public"."patients"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "patient_dependents" ADD CONSTRAINT "patient_dependents_dependent_patient_id_patients_id_fk" FOREIGN KEY ("dependent_patient_id") REFERENCES "public"."patients"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "patient_facility_records" ADD CONSTRAINT "patient_facility_records_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "patient_facility_records" ADD CONSTRAINT "patient_facility_records_facility_id_facilities_id_fk" FOREIGN KEY ("facility_id") REFERENCES "public"."facilities"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "patient_facility_records" ADD CONSTRAINT "patient_facility_records_patient_id_patients_id_fk" FOREIGN KEY ("patient_id") REFERENCES "public"."patients"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "patient_insurance" ADD CONSTRAINT "patient_insurance_patient_id_patients_id_fk" FOREIGN KEY ("patient_id") REFERENCES "public"."patients"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "patient_insurance" ADD CONSTRAINT "patient_insurance_carrier_id_insurance_carriers_id_fk" FOREIGN KEY ("carrier_id") REFERENCES "public"."insurance_carriers"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "patient_insurance" ADD CONSTRAINT "patient_insurance_plan_id_insurance_plans_id_fk" FOREIGN KEY ("plan_id") REFERENCES "public"."insurance_plans"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "patients" ADD CONSTRAINT "patients_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "facility_accepted_plans" ADD CONSTRAINT "facility_accepted_plans_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "facility_accepted_plans" ADD CONSTRAINT "facility_accepted_plans_facility_id_facilities_id_fk" FOREIGN KEY ("facility_id") REFERENCES "public"."facilities"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "facility_accepted_plans" ADD CONSTRAINT "facility_accepted_plans_carrier_id_insurance_carriers_id_fk" FOREIGN KEY ("carrier_id") REFERENCES "public"."insurance_carriers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "facility_accepted_plans" ADD CONSTRAINT "facility_accepted_plans_plan_id_insurance_plans_id_fk" FOREIGN KEY ("plan_id") REFERENCES "public"."insurance_plans"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "insurance_aliases" ADD CONSTRAINT "insurance_aliases_carrier_id_insurance_carriers_id_fk" FOREIGN KEY ("carrier_id") REFERENCES "public"."insurance_carriers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "insurance_aliases" ADD CONSTRAINT "insurance_aliases_plan_id_insurance_plans_id_fk" FOREIGN KEY ("plan_id") REFERENCES "public"."insurance_plans"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "insurance_plans" ADD CONSTRAINT "insurance_plans_carrier_id_insurance_carriers_id_fk" FOREIGN KEY ("carrier_id") REFERENCES "public"."insurance_carriers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "insurance_regions" ADD CONSTRAINT "insurance_regions_carrier_id_insurance_carriers_id_fk" FOREIGN KEY ("carrier_id") REFERENCES "public"."insurance_carriers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "insurance_regions" ADD CONSTRAINT "insurance_regions_plan_id_insurance_plans_id_fk" FOREIGN KEY ("plan_id") REFERENCES "public"."insurance_plans"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "provider_accepted_plans" ADD CONSTRAINT "provider_accepted_plans_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "provider_accepted_plans" ADD CONSTRAINT "provider_accepted_plans_provider_id_providers_id_fk" FOREIGN KEY ("provider_id") REFERENCES "public"."providers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "provider_accepted_plans" ADD CONSTRAINT "provider_accepted_plans_carrier_id_insurance_carriers_id_fk" FOREIGN KEY ("carrier_id") REFERENCES "public"."insurance_carriers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "provider_accepted_plans" ADD CONSTRAINT "provider_accepted_plans_plan_id_insurance_plans_id_fk" FOREIGN KEY ("plan_id") REFERENCES "public"."insurance_plans"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "availability_overrides" ADD CONSTRAINT "availability_overrides_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "availability_overrides" ADD CONSTRAINT "availability_overrides_facility_id_facilities_id_fk" FOREIGN KEY ("facility_id") REFERENCES "public"."facilities"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "availability_overrides" ADD CONSTRAINT "availability_overrides_provider_id_providers_id_fk" FOREIGN KEY ("provider_id") REFERENCES "public"."providers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "availability_rules" ADD CONSTRAINT "availability_rules_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "availability_rules" ADD CONSTRAINT "availability_rules_facility_id_facilities_id_fk" FOREIGN KEY ("facility_id") REFERENCES "public"."facilities"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "availability_rules" ADD CONSTRAINT "availability_rules_provider_id_providers_id_fk" FOREIGN KEY ("provider_id") REFERENCES "public"."providers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "booking_holds" ADD CONSTRAINT "booking_holds_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "booking_holds" ADD CONSTRAINT "booking_holds_facility_id_facilities_id_fk" FOREIGN KEY ("facility_id") REFERENCES "public"."facilities"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "booking_holds" ADD CONSTRAINT "booking_holds_provider_id_providers_id_fk" FOREIGN KEY ("provider_id") REFERENCES "public"."providers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "booking_holds" ADD CONSTRAINT "booking_holds_created_by_user_id_users_id_fk" FOREIGN KEY ("created_by_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "booking_holds" ADD CONSTRAINT "booking_holds_released_by_user_id_users_id_fk" FOREIGN KEY ("released_by_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "provider_visit_reasons" ADD CONSTRAINT "provider_visit_reasons_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "provider_visit_reasons" ADD CONSTRAINT "provider_visit_reasons_provider_id_providers_id_fk" FOREIGN KEY ("provider_id") REFERENCES "public"."providers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "provider_visit_reasons" ADD CONSTRAINT "provider_visit_reasons_visit_reason_id_visit_reasons_id_fk" FOREIGN KEY ("visit_reason_id") REFERENCES "public"."visit_reasons"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "schedule_change_sets" ADD CONSTRAINT "schedule_change_sets_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "schedule_change_sets" ADD CONSTRAINT "schedule_change_sets_facility_id_facilities_id_fk" FOREIGN KEY ("facility_id") REFERENCES "public"."facilities"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "schedule_change_sets" ADD CONSTRAINT "schedule_change_sets_provider_id_providers_id_fk" FOREIGN KEY ("provider_id") REFERENCES "public"."providers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "schedule_change_sets" ADD CONSTRAINT "schedule_change_sets_created_by_user_id_users_id_fk" FOREIGN KEY ("created_by_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "schedule_templates" ADD CONSTRAINT "schedule_templates_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "schedule_templates" ADD CONSTRAINT "schedule_templates_facility_id_facilities_id_fk" FOREIGN KEY ("facility_id") REFERENCES "public"."facilities"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "schedule_templates" ADD CONSTRAINT "schedule_templates_created_by_user_id_users_id_fk" FOREIGN KEY ("created_by_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "visit_reasons" ADD CONSTRAINT "visit_reasons_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "visit_reasons" ADD CONSTRAINT "visit_reasons_facility_id_facilities_id_fk" FOREIGN KEY ("facility_id") REFERENCES "public"."facilities"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "appointment_events" ADD CONSTRAINT "appointment_events_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "appointment_events" ADD CONSTRAINT "appointment_events_appointment_id_appointments_id_fk" FOREIGN KEY ("appointment_id") REFERENCES "public"."appointments"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "appointment_events" ADD CONSTRAINT "appointment_events_actor_user_id_users_id_fk" FOREIGN KEY ("actor_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "appointments" ADD CONSTRAINT "appointments_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "appointments" ADD CONSTRAINT "appointments_facility_id_facilities_id_fk" FOREIGN KEY ("facility_id") REFERENCES "public"."facilities"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "appointments" ADD CONSTRAINT "appointments_provider_id_providers_id_fk" FOREIGN KEY ("provider_id") REFERENCES "public"."providers"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "appointments" ADD CONSTRAINT "appointments_patient_id_patients_id_fk" FOREIGN KEY ("patient_id") REFERENCES "public"."patients"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "appointments" ADD CONSTRAINT "appointments_visit_reason_id_visit_reasons_id_fk" FOREIGN KEY ("visit_reason_id") REFERENCES "public"."visit_reasons"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "appointments" ADD CONSTRAINT "appointments_cancelled_by_user_id_users_id_fk" FOREIGN KEY ("cancelled_by_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "appointments" ADD CONSTRAINT "appointments_created_by_user_id_users_id_fk" FOREIGN KEY ("created_by_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_appointment_id_appointments_id_fk" FOREIGN KEY ("appointment_id") REFERENCES "public"."appointments"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_facility_id_facilities_id_fk" FOREIGN KEY ("facility_id") REFERENCES "public"."facilities"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_provider_id_providers_id_fk" FOREIGN KEY ("provider_id") REFERENCES "public"."providers"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_patient_id_patients_id_fk" FOREIGN KEY ("patient_id") REFERENCES "public"."patients"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "direct_installs" ADD CONSTRAINT "direct_installs_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "direct_installs" ADD CONSTRAINT "direct_installs_direct_page_id_direct_pages_id_fk" FOREIGN KEY ("direct_page_id") REFERENCES "public"."direct_pages"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "direct_installs" ADD CONSTRAINT "direct_installs_done_for_you_assignee_user_id_users_id_fk" FOREIGN KEY ("done_for_you_assignee_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "direct_page_providers" ADD CONSTRAINT "direct_page_providers_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "direct_page_providers" ADD CONSTRAINT "direct_page_providers_direct_page_id_direct_pages_id_fk" FOREIGN KEY ("direct_page_id") REFERENCES "public"."direct_pages"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "direct_page_providers" ADD CONSTRAINT "direct_page_providers_provider_id_providers_id_fk" FOREIGN KEY ("provider_id") REFERENCES "public"."providers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "direct_pages" ADD CONSTRAINT "direct_pages_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "direct_pages" ADD CONSTRAINT "direct_pages_facility_id_facilities_id_fk" FOREIGN KEY ("facility_id") REFERENCES "public"."facilities"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "agency_clients" ADD CONSTRAINT "agency_clients_agency_id_agencies_id_fk" FOREIGN KEY ("agency_id") REFERENCES "public"."agencies"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "agency_clients" ADD CONSTRAINT "agency_clients_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "agency_engagements" ADD CONSTRAINT "agency_engagements_agency_id_agencies_id_fk" FOREIGN KEY ("agency_id") REFERENCES "public"."agencies"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "agency_engagements" ADD CONSTRAINT "agency_engagements_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "agency_engagements" ADD CONSTRAINT "agency_engagements_actor_user_id_users_id_fk" FOREIGN KEY ("actor_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "campaign_clicks" ADD CONSTRAINT "campaign_clicks_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "campaign_clicks" ADD CONSTRAINT "campaign_clicks_campaign_id_campaigns_id_fk" FOREIGN KEY ("campaign_id") REFERENCES "public"."campaigns"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "campaign_clicks" ADD CONSTRAINT "campaign_clicks_tracking_link_id_campaign_tracking_links_id_fk" FOREIGN KEY ("tracking_link_id") REFERENCES "public"."campaign_tracking_links"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "campaign_daily_metrics" ADD CONSTRAINT "campaign_daily_metrics_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "campaign_daily_metrics" ADD CONSTRAINT "campaign_daily_metrics_campaign_id_campaigns_id_fk" FOREIGN KEY ("campaign_id") REFERENCES "public"."campaigns"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "campaign_tracking_links" ADD CONSTRAINT "campaign_tracking_links_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "campaign_tracking_links" ADD CONSTRAINT "campaign_tracking_links_campaign_id_campaigns_id_fk" FOREIGN KEY ("campaign_id") REFERENCES "public"."campaigns"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "campaigns" ADD CONSTRAINT "campaigns_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "campaigns" ADD CONSTRAINT "campaigns_facility_id_facilities_id_fk" FOREIGN KEY ("facility_id") REFERENCES "public"."facilities"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "campaigns" ADD CONSTRAINT "campaigns_agency_id_agencies_id_fk" FOREIGN KEY ("agency_id") REFERENCES "public"."agencies"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "campaigns" ADD CONSTRAINT "campaigns_target_specialty_id_specialties_id_fk" FOREIGN KEY ("target_specialty_id") REFERENCES "public"."specialties"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "campaigns" ADD CONSTRAINT "campaigns_target_provider_id_providers_id_fk" FOREIGN KEY ("target_provider_id") REFERENCES "public"."providers"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "campaigns" ADD CONSTRAINT "campaigns_created_by_user_id_users_id_fk" FOREIGN KEY ("created_by_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bundle_items" ADD CONSTRAINT "bundle_items_bundle_id_bundles_id_fk" FOREIGN KEY ("bundle_id") REFERENCES "public"."bundles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bundle_items" ADD CONSTRAINT "bundle_items_plan_id_billing_plans_id_fk" FOREIGN KEY ("plan_id") REFERENCES "public"."billing_plans"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bundle_items" ADD CONSTRAINT "bundle_items_addon_id_addons_id_fk" FOREIGN KEY ("addon_id") REFERENCES "public"."addons"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "credit_ledger" ADD CONSTRAINT "credit_ledger_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "credit_ledger" ADD CONSTRAINT "credit_ledger_addon_id_addons_id_fk" FOREIGN KEY ("addon_id") REFERENCES "public"."addons"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "credit_ledger" ADD CONSTRAINT "credit_ledger_actor_user_id_users_id_fk" FOREIGN KEY ("actor_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invoice_line_items" ADD CONSTRAINT "invoice_line_items_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invoice_line_items" ADD CONSTRAINT "invoice_line_items_invoice_id_invoices_id_fk" FOREIGN KEY ("invoice_id") REFERENCES "public"."invoices"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payment_methods" ADD CONSTRAINT "payment_methods_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "subscription_addons" ADD CONSTRAINT "subscription_addons_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "subscription_addons" ADD CONSTRAINT "subscription_addons_subscription_id_subscriptions_id_fk" FOREIGN KEY ("subscription_id") REFERENCES "public"."subscriptions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "subscription_addons" ADD CONSTRAINT "subscription_addons_addon_id_addons_id_fk" FOREIGN KEY ("addon_id") REFERENCES "public"."addons"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "subscriptions" ADD CONSTRAINT "subscriptions_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "subscriptions" ADD CONSTRAINT "subscriptions_plan_id_billing_plans_id_fk" FOREIGN KEY ("plan_id") REFERENCES "public"."billing_plans"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "subscriptions" ADD CONSTRAINT "subscriptions_bundle_id_bundles_id_fk" FOREIGN KEY ("bundle_id") REFERENCES "public"."bundles"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "usage_daily_rollups" ADD CONSTRAINT "usage_daily_rollups_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "usage_events" ADD CONSTRAINT "usage_events_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "usage_events" ADD CONSTRAINT "usage_events_facility_id_facilities_id_fk" FOREIGN KEY ("facility_id") REFERENCES "public"."facilities"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "announcements" ADD CONSTRAINT "announcements_created_by_user_id_users_id_fk" FOREIGN KEY ("created_by_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notification_preferences" ADD CONSTRAINT "notification_preferences_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notification_preferences" ADD CONSTRAINT "notification_preferences_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_recipient_user_id_users_id_fk" FOREIGN KEY ("recipient_user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "outbound_messages" ADD CONSTRAINT "outbound_messages_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "outbound_messages" ADD CONSTRAINT "outbound_messages_recipient_user_id_users_id_fk" FOREIGN KEY ("recipient_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "outbound_messages" ADD CONSTRAINT "outbound_messages_notification_id_notifications_id_fk" FOREIGN KEY ("notification_id") REFERENCES "public"."notifications"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "approval_requests" ADD CONSTRAINT "approval_requests_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "approval_requests" ADD CONSTRAINT "approval_requests_submitted_by_user_id_users_id_fk" FOREIGN KEY ("submitted_by_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "approval_requests" ADD CONSTRAINT "approval_requests_assigned_to_user_id_users_id_fk" FOREIGN KEY ("assigned_to_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "approval_requests" ADD CONSTRAINT "approval_requests_decided_by_user_id_users_id_fk" FOREIGN KEY ("decided_by_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "media_assets" ADD CONSTRAINT "media_assets_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "media_assets" ADD CONSTRAINT "media_assets_facility_id_facilities_id_fk" FOREIGN KEY ("facility_id") REFERENCES "public"."facilities"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "media_assets" ADD CONSTRAINT "media_assets_uploaded_by_user_id_users_id_fk" FOREIGN KEY ("uploaded_by_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "media_assets" ADD CONSTRAINT "media_assets_moderated_by_user_id_users_id_fk" FOREIGN KEY ("moderated_by_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "provider_transfers" ADD CONSTRAINT "provider_transfers_provider_id_providers_id_fk" FOREIGN KEY ("provider_id") REFERENCES "public"."providers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "provider_transfers" ADD CONSTRAINT "provider_transfers_current_organization_id_organizations_id_fk" FOREIGN KEY ("current_organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "provider_transfers" ADD CONSTRAINT "provider_transfers_current_facility_id_facilities_id_fk" FOREIGN KEY ("current_facility_id") REFERENCES "public"."facilities"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "provider_transfers" ADD CONSTRAINT "provider_transfers_target_organization_id_organizations_id_fk" FOREIGN KEY ("target_organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "provider_transfers" ADD CONSTRAINT "provider_transfers_target_facility_id_facilities_id_fk" FOREIGN KEY ("target_facility_id") REFERENCES "public"."facilities"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "provider_transfers" ADD CONSTRAINT "provider_transfers_early_release_granted_by_user_id_users_id_fk" FOREIGN KEY ("early_release_granted_by_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "provider_transfers" ADD CONSTRAINT "provider_transfers_requested_by_user_id_users_id_fk" FOREIGN KEY ("requested_by_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "facility_settings" ADD CONSTRAINT "facility_settings_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "facility_settings" ADD CONSTRAINT "facility_settings_facility_id_facilities_id_fk" FOREIGN KEY ("facility_id") REFERENCES "public"."facilities"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "feature_flag_overrides" ADD CONSTRAINT "feature_flag_overrides_flag_id_feature_flags_id_fk" FOREIGN KEY ("flag_id") REFERENCES "public"."feature_flags"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "feature_flag_overrides" ADD CONSTRAINT "feature_flag_overrides_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "organization_settings" ADD CONSTRAINT "organization_settings_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "onboarding_sessions" ADD CONSTRAINT "onboarding_sessions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "onboarding_sessions" ADD CONSTRAINT "onboarding_sessions_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "report_exports" ADD CONSTRAINT "report_exports_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "report_exports" ADD CONSTRAINT "report_exports_requested_by_user_id_users_id_fk" FOREIGN KEY ("requested_by_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "saved_report_views" ADD CONSTRAINT "saved_report_views_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "saved_report_views" ADD CONSTRAINT "saved_report_views_owner_user_id_users_id_fk" FOREIGN KEY ("owner_user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_actor_user_id_users_id_fk" FOREIGN KEY ("actor_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "phi_access_logs" ADD CONSTRAINT "phi_access_logs_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "phi_access_logs" ADD CONSTRAINT "phi_access_logs_actor_user_id_users_id_fk" FOREIGN KEY ("actor_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "integration_connections" ADD CONSTRAINT "integration_connections_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "integration_connections" ADD CONSTRAINT "integration_connections_facility_id_facilities_id_fk" FOREIGN KEY ("facility_id") REFERENCES "public"."facilities"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "integration_sync_runs" ADD CONSTRAINT "integration_sync_runs_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "integration_sync_runs" ADD CONSTRAINT "integration_sync_runs_connection_id_integration_connections_id_fk" FOREIGN KEY ("connection_id") REFERENCES "public"."integration_connections"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "mfa_factors_user_method_unique" ON "mfa_factors" USING btree ("user_id","method");--> statement-breakpoint
CREATE UNIQUE INDEX "rate_limit_buckets_key_window_unique" ON "rate_limit_buckets" USING btree ("key_hash","window_start");--> statement-breakpoint
CREATE INDEX "rate_limit_buckets_window_idx" ON "rate_limit_buckets" USING btree ("window_start");--> statement-breakpoint
CREATE INDEX "sessions_user_idx" ON "sessions" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "sessions_expires_idx" ON "sessions" USING btree ("expires_at");--> statement-breakpoint
CREATE UNIQUE INDEX "trusted_devices_user_fingerprint_unique" ON "trusted_devices" USING btree ("user_id","device_fingerprint");--> statement-breakpoint
CREATE UNIQUE INDEX "user_identities_provider_account_unique" ON "user_identities" USING btree ("provider","provider_account_id");--> statement-breakpoint
CREATE INDEX "user_identities_user_idx" ON "user_identities" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "users_email_unique" ON "users" USING btree ("email") WHERE deleted_at is null;--> statement-breakpoint
CREATE INDEX "users_phone_idx" ON "users" USING btree ("phone");--> statement-breakpoint
CREATE INDEX "users_type_status_idx" ON "users" USING btree ("type","status");--> statement-breakpoint
CREATE INDEX "verification_codes_destination_idx" ON "verification_codes" USING btree ("destination","purpose");--> statement-breakpoint
CREATE INDEX "verification_codes_expires_idx" ON "verification_codes" USING btree ("expires_at");--> statement-breakpoint
CREATE UNIQUE INDEX "facilities_org_slug_unique" ON "facilities" USING btree ("organization_id","slug");--> statement-breakpoint
CREATE INDEX "facilities_org_idx" ON "facilities" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "facilities_geo_idx" ON "facilities" USING btree ("latitude","longitude");--> statement-breakpoint
CREATE INDEX "facilities_listed_idx" ON "facilities" USING btree ("is_publicly_listed","status") WHERE deleted_at is null;--> statement-breakpoint
CREATE INDEX "facility_services_facility_idx" ON "facility_services" USING btree ("facility_id");--> statement-breakpoint
CREATE UNIQUE INDEX "memberships_user_org_wide_unique" ON "memberships" USING btree ("user_id","organization_id") WHERE facility_id is null;--> statement-breakpoint
CREATE UNIQUE INDEX "memberships_user_facility_unique" ON "memberships" USING btree ("user_id","facility_id") WHERE facility_id is not null;--> statement-breakpoint
CREATE INDEX "memberships_org_idx" ON "memberships" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "memberships_user_idx" ON "memberships" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "organizations_status_idx" ON "organizations" USING btree ("status");--> statement-breakpoint
CREATE INDEX "organizations_office_type_idx" ON "organizations" USING btree ("office_type");--> statement-breakpoint
CREATE UNIQUE INDEX "role_permissions_unique" ON "role_permissions" USING btree ("role_id","permission_key");--> statement-breakpoint
CREATE INDEX "specialties_featured_idx" ON "specialties" USING btree ("is_featured","display_order");--> statement-breakpoint
CREATE UNIQUE INDEX "provider_facilities_unique" ON "provider_facilities" USING btree ("provider_id","facility_id");--> statement-breakpoint
CREATE INDEX "provider_facilities_facility_idx" ON "provider_facilities" USING btree ("facility_id");--> statement-breakpoint
CREATE UNIQUE INDEX "provider_licenses_unique" ON "provider_licenses" USING btree ("provider_id","state","license_number");--> statement-breakpoint
CREATE INDEX "provider_licenses_expiry_idx" ON "provider_licenses" USING btree ("expires_on");--> statement-breakpoint
CREATE UNIQUE INDEX "provider_specialties_unique" ON "provider_specialties" USING btree ("provider_id","specialty_id");--> statement-breakpoint
CREATE UNIQUE INDEX "providers_org_npi_unique" ON "providers" USING btree ("organization_id","npi") WHERE npi is not null and deleted_at is null;--> statement-breakpoint
CREATE UNIQUE INDEX "providers_org_slug_unique" ON "providers" USING btree ("organization_id","slug") WHERE slug is not null;--> statement-breakpoint
CREATE INDEX "providers_org_idx" ON "providers" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "providers_listed_idx" ON "providers" USING btree ("is_publicly_listed","status") WHERE deleted_at is null;--> statement-breakpoint
CREATE INDEX "patient_addresses_patient_idx" ON "patient_addresses" USING btree ("patient_id");--> statement-breakpoint
CREATE UNIQUE INDEX "patient_dependents_unique" ON "patient_dependents" USING btree ("guardian_patient_id","dependent_patient_id");--> statement-breakpoint
CREATE INDEX "patient_dependents_dependent_idx" ON "patient_dependents" USING btree ("dependent_patient_id");--> statement-breakpoint
CREATE INDEX "patient_dependents_guardian_user_idx" ON "patient_dependents" USING btree ("guardian_user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "patient_facility_records_unique" ON "patient_facility_records" USING btree ("facility_id","external_system","external_patient_id");--> statement-breakpoint
CREATE INDEX "patient_facility_records_patient_idx" ON "patient_facility_records" USING btree ("patient_id");--> statement-breakpoint
CREATE INDEX "patient_insurance_patient_idx" ON "patient_insurance" USING btree ("patient_id");--> statement-breakpoint
CREATE INDEX "patients_user_idx" ON "patients" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "patients_name_dob_idx" ON "patients" USING btree ("last_name","first_name","date_of_birth");--> statement-breakpoint
CREATE INDEX "patients_phone_idx" ON "patients" USING btree ("phone");--> statement-breakpoint
CREATE INDEX "patients_email_idx" ON "patients" USING btree ("email");--> statement-breakpoint
CREATE INDEX "facility_accepted_plans_carrier_idx" ON "facility_accepted_plans" USING btree ("carrier_id");--> statement-breakpoint
CREATE INDEX "insurance_aliases_alias_idx" ON "insurance_aliases" USING btree ("alias");--> statement-breakpoint
CREATE INDEX "insurance_aliases_carrier_idx" ON "insurance_aliases" USING btree ("carrier_id");--> statement-breakpoint
CREATE INDEX "insurance_carriers_active_idx" ON "insurance_carriers" USING btree ("is_active");--> statement-breakpoint
CREATE UNIQUE INDEX "insurance_plans_carrier_slug_unique" ON "insurance_plans" USING btree ("carrier_id","slug");--> statement-breakpoint
CREATE INDEX "insurance_plans_carrier_idx" ON "insurance_plans" USING btree ("carrier_id");--> statement-breakpoint
CREATE INDEX "insurance_regions_state_idx" ON "insurance_regions" USING btree ("state");--> statement-breakpoint
CREATE INDEX "availability_overrides_lookup_idx" ON "availability_overrides" USING btree ("facility_id","on_date","provider_id");--> statement-breakpoint
CREATE INDEX "availability_rules_lookup_idx" ON "availability_rules" USING btree ("facility_id","provider_id","weekday");--> statement-breakpoint
CREATE INDEX "availability_rules_org_idx" ON "availability_rules" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "booking_holds_active_idx" ON "booking_holds" USING btree ("facility_id","starts_at","ends_at") WHERE released_at is null;--> statement-breakpoint
CREATE UNIQUE INDEX "provider_visit_reasons_unique" ON "provider_visit_reasons" USING btree ("provider_id","visit_reason_id");--> statement-breakpoint
CREATE INDEX "schedule_change_sets_facility_idx" ON "schedule_change_sets" USING btree ("facility_id","created_at");--> statement-breakpoint
CREATE INDEX "schedule_templates_org_idx" ON "schedule_templates" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "visit_reasons_org_idx" ON "visit_reasons" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "visit_reasons_facility_idx" ON "visit_reasons" USING btree ("facility_id");--> statement-breakpoint
CREATE INDEX "appointment_events_appointment_idx" ON "appointment_events" USING btree ("appointment_id","occurred_at");--> statement-breakpoint
CREATE INDEX "appointments_facility_starts_idx" ON "appointments" USING btree ("facility_id","starts_at");--> statement-breakpoint
CREATE INDEX "appointments_provider_starts_idx" ON "appointments" USING btree ("provider_id","starts_at");--> statement-breakpoint
CREATE INDEX "appointments_patient_starts_idx" ON "appointments" USING btree ("patient_id","starts_at");--> statement-breakpoint
CREATE INDEX "appointments_patient_user_starts_idx" ON "appointments" USING btree ("patient_user_id","starts_at");--> statement-breakpoint
CREATE INDEX "appointments_org_status_idx" ON "appointments" USING btree ("organization_id","status");--> statement-breakpoint
CREATE INDEX "appointments_status_requested_idx" ON "appointments" USING btree ("organization_id","requested_at") WHERE status = 'requested';--> statement-breakpoint
CREATE INDEX "appointments_campaign_idx" ON "appointments" USING btree ("campaign_id");--> statement-breakpoint
CREATE UNIQUE INDEX "appointments_external_unique" ON "appointments" USING btree ("facility_id","external_system","external_appointment_id") WHERE external_appointment_id is not null;--> statement-breakpoint
CREATE UNIQUE INDEX "reviews_appointment_unique" ON "reviews" USING btree ("appointment_id");--> statement-breakpoint
CREATE INDEX "reviews_facility_published_idx" ON "reviews" USING btree ("facility_id","is_published");--> statement-breakpoint
CREATE INDEX "reviews_provider_published_idx" ON "reviews" USING btree ("provider_id","is_published");--> statement-breakpoint
CREATE INDEX "direct_installs_org_idx" ON "direct_installs" USING btree ("organization_id","status");--> statement-breakpoint
CREATE UNIQUE INDEX "direct_page_providers_unique" ON "direct_page_providers" USING btree ("direct_page_id","provider_id");--> statement-breakpoint
CREATE INDEX "direct_pages_org_idx" ON "direct_pages" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "agencies_status_idx" ON "agencies" USING btree ("status");--> statement-breakpoint
CREATE UNIQUE INDEX "agency_clients_unique" ON "agency_clients" USING btree ("agency_id","organization_id");--> statement-breakpoint
CREATE INDEX "agency_clients_org_idx" ON "agency_clients" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "agency_engagements_agency_idx" ON "agency_engagements" USING btree ("agency_id","occurred_at");--> statement-breakpoint
CREATE INDEX "campaign_clicks_campaign_occurred_idx" ON "campaign_clicks" USING btree ("campaign_id","occurred_at");--> statement-breakpoint
CREATE INDEX "campaign_clicks_visitor_idx" ON "campaign_clicks" USING btree ("visitor_id");--> statement-breakpoint
CREATE UNIQUE INDEX "campaign_daily_metrics_unique" ON "campaign_daily_metrics" USING btree ("campaign_id","on_date");--> statement-breakpoint
CREATE INDEX "campaign_daily_metrics_org_date_idx" ON "campaign_daily_metrics" USING btree ("organization_id","on_date");--> statement-breakpoint
CREATE INDEX "campaign_tracking_links_campaign_idx" ON "campaign_tracking_links" USING btree ("campaign_id");--> statement-breakpoint
CREATE INDEX "campaigns_org_status_idx" ON "campaigns" USING btree ("organization_id","status");--> statement-breakpoint
CREATE INDEX "campaigns_agency_idx" ON "campaigns" USING btree ("agency_id");--> statement-breakpoint
CREATE INDEX "campaigns_window_idx" ON "campaigns" USING btree ("starts_on","ends_on");--> statement-breakpoint
CREATE INDEX "addons_line_idx" ON "addons" USING btree ("product_line");--> statement-breakpoint
CREATE INDEX "billing_plans_line_interval_idx" ON "billing_plans" USING btree ("product_line","interval");--> statement-breakpoint
CREATE INDEX "bundle_items_bundle_idx" ON "bundle_items" USING btree ("bundle_id");--> statement-breakpoint
CREATE INDEX "credit_ledger_org_created_idx" ON "credit_ledger" USING btree ("organization_id","created_at");--> statement-breakpoint
CREATE INDEX "invoice_line_items_invoice_idx" ON "invoice_line_items" USING btree ("invoice_id");--> statement-breakpoint
CREATE INDEX "invoices_org_status_idx" ON "invoices" USING btree ("organization_id","status","created_at");--> statement-breakpoint
CREATE INDEX "payment_methods_org_idx" ON "payment_methods" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "subscription_addons_org_idx" ON "subscription_addons" USING btree ("organization_id","addon_id");--> statement-breakpoint
CREATE INDEX "subscriptions_org_idx" ON "subscriptions" USING btree ("organization_id");--> statement-breakpoint
CREATE UNIQUE INDEX "subscriptions_org_line_active_unique" ON "subscriptions" USING btree ("organization_id","plan_id") WHERE status in ('trialing','active','past_due');--> statement-breakpoint
CREATE UNIQUE INDEX "usage_daily_rollups_unique" ON "usage_daily_rollups" USING btree ("organization_id","on_date","meter");--> statement-breakpoint
CREATE INDEX "usage_events_org_meter_occurred_idx" ON "usage_events" USING btree ("organization_id","meter","occurred_at");--> statement-breakpoint
CREATE INDEX "usage_events_occurred_idx" ON "usage_events" USING btree ("occurred_at");--> statement-breakpoint
CREATE INDEX "announcements_publish_idx" ON "announcements" USING btree ("publish_at");--> statement-breakpoint
CREATE INDEX "notifications_recipient_created_idx" ON "notifications" USING btree ("recipient_user_id","created_at");--> statement-breakpoint
CREATE INDEX "notifications_unread_idx" ON "notifications" USING btree ("recipient_user_id") WHERE read_at is null and deleted_at is null;--> statement-breakpoint
CREATE INDEX "notifications_org_category_idx" ON "notifications" USING btree ("organization_id","category");--> statement-breakpoint
CREATE INDEX "outbound_messages_org_created_idx" ON "outbound_messages" USING btree ("organization_id","created_at");--> statement-breakpoint
CREATE INDEX "outbound_messages_vendor_id_idx" ON "outbound_messages" USING btree ("vendor","vendor_message_id");--> statement-breakpoint
CREATE INDEX "outbound_messages_status_idx" ON "outbound_messages" USING btree ("status");--> statement-breakpoint
CREATE UNIQUE INDEX "suppression_list_unique" ON "suppression_list" USING btree ("channel","destination");--> statement-breakpoint
CREATE INDEX "approval_requests_queue_idx" ON "approval_requests" USING btree ("status","submitted_at") WHERE status = 'pending_review';--> statement-breakpoint
CREATE INDEX "approval_requests_subject_idx" ON "approval_requests" USING btree ("subject_type","subject_id");--> statement-breakpoint
CREATE INDEX "approval_requests_org_idx" ON "approval_requests" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "media_assets_org_kind_idx" ON "media_assets" USING btree ("organization_id","kind");--> statement-breakpoint
CREATE INDEX "media_assets_moderation_queue_idx" ON "media_assets" USING btree ("moderation_status","created_at") WHERE moderation_status in ('pending','auto_flagged');--> statement-breakpoint
CREATE INDEX "provider_transfers_provider_idx" ON "provider_transfers" USING btree ("provider_id","status");--> statement-breakpoint
CREATE INDEX "provider_transfers_target_idx" ON "provider_transfers" USING btree ("target_organization_id","status");--> statement-breakpoint
CREATE UNIQUE INDEX "feature_flag_overrides_unique" ON "feature_flag_overrides" USING btree ("flag_id","organization_id");--> statement-breakpoint
CREATE INDEX "feature_flags_enabled_idx" ON "feature_flags" USING btree ("is_enabled_globally");--> statement-breakpoint
CREATE INDEX "onboarding_sessions_user_idx" ON "onboarding_sessions" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "onboarding_sessions_status_idx" ON "onboarding_sessions" USING btree ("kind","status","last_active_at");--> statement-breakpoint
CREATE INDEX "onboarding_sessions_org_idx" ON "onboarding_sessions" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "report_exports_org_created_idx" ON "report_exports" USING btree ("organization_id","created_at");--> statement-breakpoint
CREATE INDEX "report_exports_queue_idx" ON "report_exports" USING btree ("status","created_at") WHERE status in ('queued','processing');--> statement-breakpoint
CREATE INDEX "report_exports_expiry_idx" ON "report_exports" USING btree ("expires_at");--> statement-breakpoint
CREATE INDEX "saved_report_views_org_kind_idx" ON "saved_report_views" USING btree ("organization_id","kind");--> statement-breakpoint
CREATE INDEX "audit_logs_org_occurred_idx" ON "audit_logs" USING btree ("organization_id","occurred_at");--> statement-breakpoint
CREATE INDEX "audit_logs_resource_idx" ON "audit_logs" USING btree ("resource_type","resource_id");--> statement-breakpoint
CREATE INDEX "audit_logs_actor_idx" ON "audit_logs" USING btree ("actor_user_id","occurred_at");--> statement-breakpoint
CREATE INDEX "audit_logs_action_idx" ON "audit_logs" USING btree ("action");--> statement-breakpoint
CREATE INDEX "phi_access_logs_patient_idx" ON "phi_access_logs" USING btree ("patient_id","occurred_at");--> statement-breakpoint
CREATE INDEX "phi_access_logs_actor_idx" ON "phi_access_logs" USING btree ("actor_user_id","occurred_at");--> statement-breakpoint
CREATE INDEX "phi_access_logs_org_idx" ON "phi_access_logs" USING btree ("organization_id","occurred_at");--> statement-breakpoint
CREATE INDEX "webhook_events_vendor_external_idx" ON "webhook_events" USING btree ("vendor","external_event_id");--> statement-breakpoint
CREATE INDEX "webhook_events_unprocessed_idx" ON "webhook_events" USING btree ("vendor","received_at") WHERE processed_at is null;--> statement-breakpoint
CREATE INDEX "geocode_cache_expiry_idx" ON "geocode_cache" USING btree ("expires_at");--> statement-breakpoint
CREATE INDEX "integration_connections_status_idx" ON "integration_connections" USING btree ("provider","status");--> statement-breakpoint
CREATE INDEX "integration_sync_runs_connection_idx" ON "integration_sync_runs" USING btree ("connection_id","started_at");--> statement-breakpoint
CREATE INDEX "search_index_jobs_pending_idx" ON "search_index_jobs" USING btree ("created_at") WHERE processed_at is null;--> statement-breakpoint
CREATE UNIQUE INDEX "search_index_jobs_pending_unique" ON "search_index_jobs" USING btree ("collection","document_id") WHERE processed_at is null;