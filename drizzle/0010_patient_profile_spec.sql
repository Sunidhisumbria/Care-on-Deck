ALTER TABLE "patients" ADD COLUMN "gender_identity_updated_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "patients" ADD COLUMN "gender_identity_source" varchar(30);--> statement-breakpoint
ALTER TABLE "patients" ADD COLUMN "secondary_phone" varchar(20);--> statement-breakpoint
ALTER TABLE "patients" ADD COLUMN "secondary_phone_type" varchar(10);--> statement-breakpoint
-- Data to the client's spec (row-level security is forced, so as the system actor).
SELECT set_config('app.actor_kind', 'system', false);--> statement-breakpoint
-- "Relationship to policyholder" now offers Parent or guardian instead of Child:
-- both mean the policyholder is the patient's parent.
UPDATE "patient_insurance" SET "subscriber_relationship" = 'parent_guardian' WHERE "subscriber_relationship" = 'child';--> statement-breakpoint
-- Phone type is Mobile or Home only.
UPDATE "patients" SET "phone_type" = NULL WHERE "phone_type" NOT IN ('mobile', 'home');--> statement-breakpoint
-- Gender identity was briefly free text; anything not on the list is cleared rather than guessed.
UPDATE "patients" SET "gender_identity" = NULL WHERE "gender_identity" IS NOT NULL AND "gender_identity" NOT IN ('woman','man','transgender_woman','transgender_man','nonbinary','genderqueer','questioning_unsure','gender_not_listed','prefer_not_to_say');--> statement-breakpoint
SELECT set_config('app.actor_kind', '', false);
