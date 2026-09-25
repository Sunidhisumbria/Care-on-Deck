ALTER TYPE "public"."media_kind" ADD VALUE 'patient_photo';--> statement-breakpoint
ALTER TABLE "patients" ADD COLUMN "gender_identity" varchar(60);--> statement-breakpoint
ALTER TABLE "patients" ADD COLUMN "photo_media_id" uuid;--> statement-breakpoint
ALTER TABLE "patients" ADD COLUMN "phone_type" varchar(10);