ALTER TABLE "patients" ADD COLUMN "location_place_id" varchar(255);--> statement-breakpoint
ALTER TABLE "patients" ADD COLUMN "location_label" varchar(300);--> statement-breakpoint
ALTER TABLE "patients" ADD COLUMN "location_latitude" double precision;--> statement-breakpoint
ALTER TABLE "patients" ADD COLUMN "location_longitude" double precision;