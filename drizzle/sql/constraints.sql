-- ===========================================================================
--  Foreign keys that Drizzle cannot express without a circular import between
--  schema modules. Applied by `npm run db:rls`, before rls.sql.
--
--  Idempotent: each constraint is dropped and recreated.
-- ===========================================================================

begin;

alter table public.sessions drop constraint if exists sessions_active_organization_fk;
alter table public.sessions add constraint sessions_active_organization_fk
  foreign key (active_organization_id) references public.organizations(id) on delete set null;

alter table public.sessions drop constraint if exists sessions_active_facility_fk;
alter table public.sessions add constraint sessions_active_facility_fk
  foreign key (active_facility_id) references public.facilities(id) on delete set null;

alter table public.providers drop constraint if exists providers_headshot_media_fk;
alter table public.providers add constraint providers_headshot_media_fk
  foreign key (headshot_media_id) references public.media_assets(id) on delete set null;

alter table public.provider_licenses drop constraint if exists provider_licenses_document_media_fk;
alter table public.provider_licenses add constraint provider_licenses_document_media_fk
  foreign key (document_media_id) references public.media_assets(id) on delete set null;

alter table public.patient_insurance drop constraint if exists patient_insurance_card_front_fk;
alter table public.patient_insurance add constraint patient_insurance_card_front_fk
  foreign key (card_front_media_id) references public.media_assets(id) on delete set null;

alter table public.patient_insurance drop constraint if exists patient_insurance_card_back_fk;
alter table public.patient_insurance add constraint patient_insurance_card_back_fk
  foreign key (card_back_media_id) references public.media_assets(id) on delete set null;

alter table public.patients drop constraint if exists patients_merged_into_fk;
alter table public.patients add constraint patients_merged_into_fk
  foreign key (merged_into_patient_id) references public.patients(id) on delete set null;

alter table public.specialties drop constraint if exists specialties_parent_fk;
alter table public.specialties add constraint specialties_parent_fk
  foreign key (parent_id) references public.specialties(id) on delete set null;

alter table public.appointments drop constraint if exists appointments_rescheduled_from_fk;
alter table public.appointments add constraint appointments_rescheduled_from_fk
  foreign key (rescheduled_from_id) references public.appointments(id) on delete set null;

alter table public.appointments drop constraint if exists appointments_direct_page_fk;
alter table public.appointments add constraint appointments_direct_page_fk
  foreign key (direct_page_id) references public.direct_pages(id) on delete set null;

alter table public.appointments drop constraint if exists appointments_campaign_fk;
alter table public.appointments add constraint appointments_campaign_fk
  foreign key (campaign_id) references public.campaigns(id) on delete set null;

alter table public.appointments drop constraint if exists appointments_patient_insurance_fk;
alter table public.appointments add constraint appointments_patient_insurance_fk
  foreign key (patient_insurance_id) references public.patient_insurance(id) on delete set null;

alter table public.credit_ledger drop constraint if exists credit_ledger_usage_event_fk;
alter table public.credit_ledger add constraint credit_ledger_usage_event_fk
  foreign key (usage_event_id) references public.usage_events(id) on delete set null;

alter table public.credit_ledger drop constraint if exists credit_ledger_invoice_fk;
alter table public.credit_ledger add constraint credit_ledger_invoice_fk
  foreign key (invoice_id) references public.invoices(id) on delete set null;

alter table public.onboarding_sessions drop constraint if exists onboarding_sessions_facility_fk;
alter table public.onboarding_sessions add constraint onboarding_sessions_facility_fk
  foreign key (facility_id) references public.facilities(id) on delete set null;

alter table public.onboarding_sessions drop constraint if exists onboarding_sessions_provider_fk;
alter table public.onboarding_sessions add constraint onboarding_sessions_provider_fk
  foreign key (provider_id) references public.providers(id) on delete set null;

alter table public.onboarding_sessions drop constraint if exists onboarding_sessions_approval_fk;
alter table public.onboarding_sessions add constraint onboarding_sessions_approval_fk
  foreign key (approval_request_id) references public.approval_requests(id) on delete set null;

commit;
