ALTER TABLE "agencies" ADD COLUMN "agency_type" varchar(40);--> statement-breakpoint
ALTER TABLE "campaigns" ADD COLUMN "campaign_type" varchar(40);--> statement-breakpoint
ALTER TABLE "campaigns" ADD COLUMN "description" text;