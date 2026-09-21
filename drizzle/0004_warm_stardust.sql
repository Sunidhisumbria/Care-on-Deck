CREATE TYPE "public"."insurance_type" AS ENUM('health', 'dental');--> statement-breakpoint
ALTER TABLE "patient_insurance" ADD COLUMN "insurance_type" "insurance_type" NOT NULL;