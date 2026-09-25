CREATE TABLE "patient_saved_providers" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"patient_id" uuid NOT NULL,
	"provider_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "patient_saved_providers" ADD CONSTRAINT "patient_saved_providers_patient_id_patients_id_fk" FOREIGN KEY ("patient_id") REFERENCES "public"."patients"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "patient_saved_providers" ADD CONSTRAINT "patient_saved_providers_provider_id_providers_id_fk" FOREIGN KEY ("provider_id") REFERENCES "public"."providers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "patient_saved_providers_unique" ON "patient_saved_providers" USING btree ("patient_id","provider_id");--> statement-breakpoint
CREATE INDEX "patient_saved_providers_provider_idx" ON "patient_saved_providers" USING btree ("provider_id");