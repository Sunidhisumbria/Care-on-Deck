-- ===========================================================================
--  CareOndeck -- Row Level Security
--
--  Run AFTER `npm run db:migrate`, as the table owner:
--      npm run db:rls
--
--  This file is idempotent: it drops and recreates every policy it manages,
--  so it can be re-run after any migration that adds a table.
--
--  ROLES. This script creates `careondeck_app` (NOLOGIN) if it is missing and
--  grants it exactly what the application needs -- so a single DATABASE_URL is
--  enough to get running.
--
--  Before production, give that role a password and point DATABASE_URL at it:
--
--      alter role careondeck_app login password '...';
--
--  Postgres skips row-level security entirely for superusers and BYPASSRLS
--  roles, so connecting the app as one of those leaves every policy below
--  inert. Connecting as the table owner is fine -- the tables are FORCEd.
-- ===========================================================================

begin;

-- ---------------------------------------------------------------------------
--  1. Context helpers
--
--  Read the transaction-local GUCs that src/server/db/tenant.ts sets. All are
--  STABLE so the planner can hoist them out of row-by-row evaluation.
-- ---------------------------------------------------------------------------

/*
 * The application role. Created NOLOGIN so this script is self-sufficient on a
 * fresh database; grant it a password when you are ready to connect as it.
 */
do $$
begin
  if not exists (select 1 from pg_roles where rolname = 'careondeck_app') then
    create role careondeck_app nologin;
  end if;
end;
$$;

create schema if not exists app;
grant usage on schema app to careondeck_app;

create or replace function app.actor_kind() returns text
  language sql stable as $$
    select coalesce(nullif(current_setting('app.actor_kind', true), ''), 'anonymous')
  $$;

create or replace function app.current_user_id() returns uuid
  language sql stable as $$
    select nullif(current_setting('app.current_user_id', true), '')::uuid
  $$;

create or replace function app.current_org_id() returns uuid
  language sql stable as $$
    select nullif(current_setting('app.current_org_id', true), '')::uuid
  $$;

create or replace function app.current_facility_id() returns uuid
  language sql stable as $$
    select nullif(current_setting('app.current_facility_id', true), '')::uuid
  $$;

/* CareOndeck staff in Control Center: reads across tenants. */
create or replace function app.is_internal() returns boolean
  language sql stable as $$ select app.actor_kind() = 'internal' $$;

/* Background jobs and webhook handlers. */
create or replace function app.is_system() returns boolean
  language sql stable as $$ select app.actor_kind() = 'system' $$;

/*
 * The standard tenant predicate.
 *
 * A row is visible when it belongs to the organization the transaction is
 * acting in, or when the actor is internal staff, or when a system job is
 * running unscoped. Note that `app.current_org_id()` is null for anonymous
 * traffic, and `null = anything` is null (not true) -- so the public
 * marketplace sees nothing through this predicate. Public visibility is
 * granted by the explicit read policies in section 4.
 */
create or replace function app.can_access_org(row_org_id uuid) returns boolean
  language sql stable as $$
    select
      app.is_internal()
      or (app.is_system() and (app.current_org_id() is null or app.current_org_id() = row_org_id))
      or (app.current_org_id() is not null and app.current_org_id() = row_org_id)
  $$;

-- ---------------------------------------------------------------------------
--  2. Blanket tenant policies
--
--  Every table carrying organization_id gets the same four policies. Doing this
--  in a loop means a new tenant table is protected the moment it is migrated --
--  the failure mode of hand-written policies is the one you forgot to write.
-- ---------------------------------------------------------------------------

do $$
declare
  t record;
begin
  for t in
    select c.relname as table_name
    from pg_class c
    join pg_namespace n on n.oid = c.relnamespace
    join pg_attribute a on a.attrelid = c.oid and a.attname = 'organization_id'
    where n.nspname = 'public'
      and c.relkind = 'r'
      and not a.attisdropped
      -- these carry organization_id but need bespoke rules; see section 4
      and c.relname not in (
        'organizations', 'notifications', 'notification_preferences',
        'outbound_messages', 'media_assets', 'approval_requests',
        'agency_clients', 'agency_engagements', 'audit_logs', 'phi_access_logs'
      )
  loop
    execute format('alter table public.%I enable row level security', t.table_name);
    -- FORCE so the policies also apply to the table owner during maintenance.
    execute format('alter table public.%I force row level security', t.table_name);

    execute format('drop policy if exists %I on public.%I', t.table_name || '_tenant_select', t.table_name);
    execute format('drop policy if exists %I on public.%I', t.table_name || '_tenant_insert', t.table_name);
    execute format('drop policy if exists %I on public.%I', t.table_name || '_tenant_update', t.table_name);
    execute format('drop policy if exists %I on public.%I', t.table_name || '_tenant_delete', t.table_name);

    execute format(
      'create policy %I on public.%I for select using (app.can_access_org(organization_id))',
      t.table_name || '_tenant_select', t.table_name);

    execute format(
      'create policy %I on public.%I for insert with check (app.can_access_org(organization_id))',
      t.table_name || '_tenant_insert', t.table_name);

    execute format(
      'create policy %I on public.%I for update using (app.can_access_org(organization_id)) '
      || 'with check (app.can_access_org(organization_id))',
      t.table_name || '_tenant_update', t.table_name);

    -- Deletes are reserved for staff and jobs; feature code soft-deletes.
    execute format(
      'create policy %I on public.%I for delete using (app.is_internal() or app.is_system())',
      t.table_name || '_tenant_delete', t.table_name);
  end loop;
end;
$$;

-- ---------------------------------------------------------------------------
--  3. The tenant root
-- ---------------------------------------------------------------------------

alter table public.organizations enable row level security;
alter table public.organizations force row level security;

drop policy if exists organizations_select on public.organizations;
create policy organizations_select on public.organizations
  for select using (
    app.can_access_org(id)
    -- A member can always see the orgs they belong to, which is what powers
    -- the Facility Switcher before an active org is chosen.
    or exists (
      select 1 from public.memberships m
      where m.organization_id = organizations.id
        and m.user_id = app.current_user_id()
        and m.deleted_at is null
        and m.status = 'active'
    )
  );

drop policy if exists organizations_write on public.organizations;
create policy organizations_write on public.organizations
  for all using (app.can_access_org(id)) with check (app.can_access_org(id));

-- ---------------------------------------------------------------------------
--  4. Bespoke policies
-- ---------------------------------------------------------------------------

-- 4a. Users -----------------------------------------------------------------
-- Not tenant-scoped. A user sees themself; an org sees users who hold a
-- membership in it.
alter table public.users enable row level security;
alter table public.users force row level security;

drop policy if exists users_self_or_member on public.users;
create policy users_self_or_member on public.users
  for select using (
    app.is_internal()
    or app.is_system()
    or id = app.current_user_id()
    or exists (
      select 1 from public.memberships m
      where m.user_id = users.id
        and m.organization_id = app.current_org_id()
        and m.deleted_at is null
    )
  );

drop policy if exists users_self_update on public.users;
create policy users_self_update on public.users
  for update using (app.is_internal() or app.is_system() or id = app.current_user_id())
  with check (app.is_internal() or app.is_system() or id = app.current_user_id());

drop policy if exists users_insert on public.users;
create policy users_insert on public.users
  for insert with check (true); -- signup happens before a session exists

/*
 * Session, MFA, device and linked-identity rows belong to their user.
 *
 * Internal staff are included because Control Center genuinely needs them:
 * revoking a compromised session, and answering "how does this person sign
 * in?" when someone calls support having lost their Google account.
 * IA: 14. Control Center > User Management; 12. Settings > Security Settings.
 *
 * What that exposes is bounded -- `sessions` holds a token hash rather than a
 * token, and `mfa_factors` holds ciphertext. Every such read is audited.
 */
do $$
declare tbl text;
begin
  foreach tbl in array array['sessions', 'mfa_factors', 'trusted_devices', 'user_identities']
  loop
    execute format('alter table public.%I enable row level security', tbl);
    execute format('alter table public.%I force row level security', tbl);
    execute format('drop policy if exists %I on public.%I', tbl || '_owner', tbl);
    execute format(
      'create policy %I on public.%I for all using ('
      || 'app.is_system() or app.is_internal() or user_id = app.current_user_id()'
      || ') with check ('
      || 'app.is_system() or app.is_internal() or user_id = app.current_user_id()'
      || ')',
      tbl || '_owner', tbl);
  end loop;
end;
$$;

/*
 * Password hashes. The tightest table in the schema: only the system actor may
 * touch it, which in practice means the auth service running inside
 * `withElevated`. A user cannot read their own hash, and no listing screen can
 * reach it by accident.
 */
alter table public.user_credentials enable row level security;
alter table public.user_credentials force row level security;
drop policy if exists user_credentials_system_only on public.user_credentials;
create policy user_credentials_system_only on public.user_credentials
  for all using (app.is_system()) with check (app.is_system());

-- OTP codes are written before a session exists, so they are guarded by the
-- short expiry and attempt counter in application code rather than by RLS.
alter table public.verification_codes enable row level security;
alter table public.verification_codes force row level security;
drop policy if exists verification_codes_all on public.verification_codes;
create policy verification_codes_all on public.verification_codes for all
  using (true) with check (true);

-- Rate-limit counters are written before any identity exists, and hold only
-- hashed keys -- there is nothing here worth isolating.
alter table public.rate_limit_buckets enable row level security;
alter table public.rate_limit_buckets force row level security;
drop policy if exists rate_limit_buckets_all on public.rate_limit_buckets;
create policy rate_limit_buckets_all on public.rate_limit_buckets for all
  using (true) with check (true);

-- 4b. Patients --------------------------------------------------------------
-- The tightest rule in the system. An organization has NO blanket read on
-- patients: it sees a patient only where an appointment ties that patient to
-- the org. A patient sees their own record and their dependents'.
alter table public.patients enable row level security;
alter table public.patients force row level security;

/*
 * NOTE ON RECURSION.
 *
 * The obvious way to express "a guardian may see their dependents" is to join
 * `patient_dependents` back to `patients` to find the guardian's user_id. Do
 * that and Postgres raises `infinite recursion detected in policy for relation
 * "patients"`: the patients policy reads patient_dependents, whose own policy
 * reads patients, and round it goes.
 *
 * A SECURITY DEFINER helper is the usual escape hatch, but it does not work
 * here -- `force row level security` applies policies to the table owner too,
 * so a definer function running as the owner recurses just the same.
 *
 * So `patient_dependents` carries `guardian_user_id`, denormalised from the
 * guardian's `patients.user_id` by the trigger below. Each policy can then
 * answer on its own columns, and the cycle is gone.
 */

drop policy if exists patients_access on public.patients;
create policy patients_access on public.patients
  for select using (
    app.is_internal()
    or app.is_system()
    or user_id = app.current_user_id()
    or exists (
      select 1 from public.patient_dependents pd
      where pd.dependent_patient_id = patients.id
        and pd.guardian_user_id = app.current_user_id()
        and pd.deleted_at is null
    )
    or exists (
      select 1 from public.appointments a
      where a.patient_id = patients.id
        and a.organization_id = app.current_org_id()
        and a.deleted_at is null
    )
  );

drop policy if exists patients_insert on public.patients;
create policy patients_insert on public.patients for insert with check (true);

drop policy if exists patients_update on public.patients;
create policy patients_update on public.patients
  for update using (
    app.is_internal()
    or app.is_system()
    or user_id = app.current_user_id()
    or exists (
      select 1 from public.appointments a
      where a.patient_id = patients.id
        and a.organization_id = app.current_org_id()
        and a.deleted_at is null
    )
  );

-- Patient-owned child records follow the parent.
do $$
declare tbl text;
begin
  foreach tbl in array array['patient_addresses', 'patient_insurance']
  loop
    execute format('alter table public.%I enable row level security', tbl);
    execute format('alter table public.%I force row level security', tbl);
    execute format('drop policy if exists %I on public.%I', tbl || '_via_patient', tbl);
    execute format(
      'create policy %I on public.%I for all using ('
      || 'exists (select 1 from public.patients p where p.id = %I.patient_id)'
      || ') with check ('
      || 'exists (select 1 from public.patients p where p.id = %I.patient_id)'
      || ')',
      tbl || '_via_patient', tbl, tbl, tbl);
  end loop;
end;
$$;

/*
 * WHY EACH SYNC FUNCTION SETS app.actor_kind.
 *
 * SECURITY DEFINER alone is not enough. `force row level security` binds the
 * table owner too, so a definer function still reads `patients` through
 * `patients_access` -- and mid-INSERT the appointment that would grant the
 * organization access does not exist yet, so the lookup returns nothing and the
 * denormalised column silently stays null.
 *
 * A function-level SET would be the tidy fix, but a non-superuser owner may not
 * declare one on a custom parameter. So each function raises actor_kind for the
 * one statement it needs and restores the previous value on both the normal and
 * the error path -- the elevation must never outlive the call.
 */
/*
 * Keeps `guardian_user_id` in step with the guardian's `patients.user_id`.
 * SECURITY DEFINER so it can read `patients` while the caller is mid-insert
 * and cannot yet see the row itself.
 */
create or replace function app.sync_dependent_guardian_user()
  returns trigger language plpgsql security definer
  set search_path = public, pg_temp as $$
  declare
    prev text := coalesce(current_setting('app.actor_kind', true), '');
  begin
    perform set_config('app.actor_kind', 'system', true);
    select p.user_id into new.guardian_user_id
    from public.patients p
    where p.id = new.guardian_patient_id;
    perform set_config('app.actor_kind', prev, true);
    return new;
  exception when others then
    perform set_config('app.actor_kind', prev, true);
    raise;
  end;
  $$;

drop trigger if exists patient_dependents_sync_guardian on public.patient_dependents;
create trigger patient_dependents_sync_guardian
  before insert or update of guardian_patient_id on public.patient_dependents
  for each row execute function app.sync_dependent_guardian_user();

/* When a guardian claims their account, their dependent links must follow. */
create or replace function app.sync_guardian_user_on_patient()
  returns trigger language plpgsql security definer
  set search_path = public, pg_temp as $$
  declare
    prev text := coalesce(current_setting('app.actor_kind', true), '');
  begin
    perform set_config('app.actor_kind', 'system', true);
    update public.patient_dependents
      set guardian_user_id = new.user_id
      where guardian_patient_id = new.id;
    perform set_config('app.actor_kind', prev, true);
    return null;
  exception when others then
    perform set_config('app.actor_kind', prev, true);
    raise;
  end;
  $$;

drop trigger if exists patients_sync_guardian_links on public.patients;
create trigger patients_sync_guardian_links
  after update of user_id on public.patients
  for each row when (new.user_id is distinct from old.user_id)
  execute function app.sync_guardian_user_on_patient();

alter table public.patient_dependents enable row level security;
alter table public.patient_dependents force row level security;
drop policy if exists patient_dependents_via_guardian on public.patient_dependents;
create policy patient_dependents_via_guardian on public.patient_dependents
  for all using (
    app.is_internal() or app.is_system() or guardian_user_id = app.current_user_id()
  ) with check (
    app.is_internal() or app.is_system() or guardian_user_id = app.current_user_id()
  );

-- 4c. Notifications and messages -------------------------------------------
-- organization_id is nullable here (a patient's notifications belong to no
-- tenant), so recipient identity is the fallback.
alter table public.notifications enable row level security;
alter table public.notifications force row level security;
drop policy if exists notifications_recipient on public.notifications;
create policy notifications_recipient on public.notifications
  for all using (
    app.is_internal() or app.is_system()
    or recipient_user_id = app.current_user_id()
    or (organization_id is not null and app.can_access_org(organization_id))
  ) with check (
    app.is_internal() or app.is_system()
    or recipient_user_id = app.current_user_id()
    or (organization_id is not null and app.can_access_org(organization_id))
  );

alter table public.notification_preferences enable row level security;
alter table public.notification_preferences force row level security;
drop policy if exists notification_preferences_owner on public.notification_preferences;
create policy notification_preferences_owner on public.notification_preferences
  for all using (app.is_system() or user_id = app.current_user_id())
  with check (app.is_system() or user_id = app.current_user_id());

alter table public.outbound_messages enable row level security;
alter table public.outbound_messages force row level security;
drop policy if exists outbound_messages_access on public.outbound_messages;
create policy outbound_messages_access on public.outbound_messages
  for all using (
    app.is_internal() or app.is_system()
    or (organization_id is not null and app.can_access_org(organization_id))
  ) with check (
    app.is_internal() or app.is_system()
    or (organization_id is not null and app.can_access_org(organization_id))
  );

-- 4d. Media and approvals ---------------------------------------------------
-- organization_id is nullable (platform-owned assets), so the null case is
-- explicitly limited to internal and system actors.
do $$
declare tbl text;
begin
  foreach tbl in array array['media_assets', 'approval_requests']
  loop
    execute format('alter table public.%I enable row level security', tbl);
    execute format('alter table public.%I force row level security', tbl);
    execute format('drop policy if exists %I on public.%I', tbl || '_access', tbl);
    execute format(
      'create policy %I on public.%I for all using ('
      || 'app.is_internal() or app.is_system() '
      || 'or (organization_id is not null and app.can_access_org(organization_id))'
      || ') with check ('
      || 'app.is_internal() or app.is_system() '
      || 'or (organization_id is not null and app.can_access_org(organization_id))'
      || ')',
      tbl || '_access', tbl);
  end loop;
end;
$$;

-- 4e. Agencies --------------------------------------------------------------
-- An agency is platform-level; an organization may see the agencies engaged
-- with it, and vice versa, through agency_clients.
alter table public.agency_clients enable row level security;
alter table public.agency_clients force row level security;
drop policy if exists agency_clients_access on public.agency_clients;
create policy agency_clients_access on public.agency_clients
  for all using (app.is_internal() or app.is_system() or app.can_access_org(organization_id))
  with check (app.is_internal() or app.is_system() or app.can_access_org(organization_id));

alter table public.agency_engagements enable row level security;
alter table public.agency_engagements force row level security;
drop policy if exists agency_engagements_access on public.agency_engagements;
create policy agency_engagements_access on public.agency_engagements
  for all using (
    app.is_internal() or app.is_system()
    or (organization_id is not null and app.can_access_org(organization_id))
  ) with check (app.is_internal() or app.is_system());

-- Agencies themselves are readable by staff only; the org-facing view goes
-- through agency_clients.
alter table public.agencies enable row level security;
alter table public.agencies force row level security;
drop policy if exists agencies_access on public.agencies;
create policy agencies_access on public.agencies
  for all using (
    app.is_internal() or app.is_system()
    or exists (
      select 1 from public.agency_clients ac
      where ac.agency_id = agencies.id and ac.organization_id = app.current_org_id()
    )
  ) with check (app.is_internal() or app.is_system());

-- 4f. Audit trail -- append only -------------------------------------------
-- The app role may insert and read but never modify. Combined with the absence
-- of an UPDATE/DELETE grant below, history is immutable in practice.
alter table public.audit_logs enable row level security;
alter table public.audit_logs force row level security;
drop policy if exists audit_logs_insert on public.audit_logs;
create policy audit_logs_insert on public.audit_logs for insert with check (true);
drop policy if exists audit_logs_select on public.audit_logs;
create policy audit_logs_select on public.audit_logs for select using (
  app.is_internal() or (organization_id is not null and app.can_access_org(organization_id))
);

alter table public.phi_access_logs enable row level security;
alter table public.phi_access_logs force row level security;
drop policy if exists phi_access_logs_insert on public.phi_access_logs;
create policy phi_access_logs_insert on public.phi_access_logs for insert with check (true);
drop policy if exists phi_access_logs_select on public.phi_access_logs;
create policy phi_access_logs_select on public.phi_access_logs for select using (
  app.is_internal() or (organization_id is not null and app.can_access_org(organization_id))
);

-- 4g. Public marketplace reads ---------------------------------------------
--
-- Anonymous traffic sees only what has been published AND approved.
--
-- Each policy is gated on `actor_kind() = 'anonymous'`. Permissive policies OR
-- together, so without that gate a signed-in staff member's
-- `select * from facilities` would also return every publicly listed practice
-- in the country -- correct on paper, and a footgun in every dashboard query.

drop policy if exists facilities_public_read on public.facilities;
create policy facilities_public_read on public.facilities
  for select using (
    app.actor_kind() = 'anonymous'
    and is_publicly_listed = true and status = 'active' and deleted_at is null
  );

drop policy if exists providers_public_read on public.providers;
create policy providers_public_read on public.providers
  for select using (
    app.actor_kind() = 'anonymous'
    and is_publicly_listed = true and status = 'active' and deleted_at is null
  );

drop policy if exists reviews_public_read on public.reviews;
create policy reviews_public_read on public.reviews
  for select using (
    app.actor_kind() = 'anonymous'
    and is_published = true and deleted_at is null);

drop policy if exists visit_reasons_public_read on public.visit_reasons;
create policy visit_reasons_public_read on public.visit_reasons
  for select using (
    app.actor_kind() = 'anonymous'
    and is_bookable_online = true and is_active = true and deleted_at is null);

drop policy if exists availability_rules_public_read on public.availability_rules;
create policy availability_rules_public_read on public.availability_rules
  for select using (
    app.actor_kind() = 'anonymous'
    and is_active = true and deleted_at is null);

/*
 * Child rows inherit their parent's visibility.
 *
 * The EXISTS below reads `facilities` / `providers`, which are themselves under
 * RLS -- so for the anonymous actor these policies serve, it resolves to "is
 * this parent publicly listed". The predicate cannot drift from the parent's
 * own rule, because it *is* the parent's own rule.
 *
 * Writing `using (true)` here instead would let anyone enumerate the rosters,
 * accepted insurance and closure calendars of practices that are not listed.
 */

drop policy if exists availability_overrides_public_read on public.availability_overrides;
create policy availability_overrides_public_read on public.availability_overrides
  for select using (
    app.actor_kind() = 'anonymous'
    and exists (select 1 from public.facilities f where f.id = availability_overrides.facility_id)
  );

drop policy if exists booking_holds_public_read on public.booking_holds;
create policy booking_holds_public_read on public.booking_holds
  for select using (
    app.actor_kind() = 'anonymous'
    and released_at is null
    and exists (select 1 from public.facilities f where f.id = booking_holds.facility_id)
  );

drop policy if exists direct_pages_public_read on public.direct_pages;
create policy direct_pages_public_read on public.direct_pages
  for select using (
    app.actor_kind() = 'anonymous'
    and is_published = true and deleted_at is null);

drop policy if exists facility_services_public_read on public.facility_services;
create policy facility_services_public_read on public.facility_services
  for select using (
    app.actor_kind() = 'anonymous'
    and exists (select 1 from public.facilities f where f.id = facility_services.facility_id)
  );

drop policy if exists provider_facilities_public_read on public.provider_facilities;
create policy provider_facilities_public_read on public.provider_facilities
  for select using (
    app.actor_kind() = 'anonymous'
    and exists (select 1 from public.providers p where p.id = provider_facilities.provider_id)
  );

drop policy if exists provider_specialties_public_read on public.provider_specialties;
create policy provider_specialties_public_read on public.provider_specialties
  for select using (
    app.actor_kind() = 'anonymous'
    and exists (select 1 from public.providers p where p.id = provider_specialties.provider_id)
  );

drop policy if exists facility_accepted_plans_public_read on public.facility_accepted_plans;
create policy facility_accepted_plans_public_read on public.facility_accepted_plans
  for select using (
    app.actor_kind() = 'anonymous'
    and exists (select 1 from public.facilities f where f.id = facility_accepted_plans.facility_id)
  );

drop policy if exists provider_accepted_plans_public_read on public.provider_accepted_plans;
create policy provider_accepted_plans_public_read on public.provider_accepted_plans
  for select using (
    app.actor_kind() = 'anonymous'
    and exists (select 1 from public.providers p where p.id = provider_accepted_plans.provider_id)
  );

-- A booking request from the public site: insert allowed, read is not.
drop policy if exists appointments_public_insert on public.appointments;
create policy appointments_public_insert on public.appointments
  for insert with check (app.actor_kind() = 'anonymous' and status = 'requested');

/*
 * A patient reading their own appointments -- IA: 3. Patient Dashboard.
 *
 * Without this the whole Patient Account section returns nothing: a patient
 * acts with no organization, so the tenant policy never matches them.
 *
 * The predicate uses the denormalised `patient_user_id` rather than joining
 * `patients`, because the patients policy reads `appointments` to decide org
 * access -- joining back would recurse. `patient_dependents` is safe to read
 * here: its own policy touches neither table.
 */
drop policy if exists appointments_patient_read on public.appointments;
create policy appointments_patient_read on public.appointments
  for select using (
    (app.current_user_id() is not null and patient_user_id = app.current_user_id())
    or exists (
      select 1 from public.patient_dependents pd
      where pd.dependent_patient_id = appointments.patient_id
        and pd.guardian_user_id = app.current_user_id()
        and pd.deleted_at is null
    )
  );

/* Keeps appointments.patient_user_id in step with the patient's account. */
create or replace function app.sync_appointment_patient_user()
  returns trigger language plpgsql security definer
  set search_path = public, pg_temp as $$
  declare
    prev text := coalesce(current_setting('app.actor_kind', true), '');
  begin
    perform set_config('app.actor_kind', 'system', true);
    select p.user_id into new.patient_user_id
    from public.patients p
    where p.id = new.patient_id;
    perform set_config('app.actor_kind', prev, true);
    return new;
  exception when others then
    perform set_config('app.actor_kind', prev, true);
    raise;
  end;
  $$;

drop trigger if exists appointments_sync_patient_user on public.appointments;
create trigger appointments_sync_patient_user
  before insert or update of patient_id on public.appointments
  for each row execute function app.sync_appointment_patient_user();

/* When a guest record is later claimed, its appointments must follow. */
create or replace function app.sync_appointment_user_on_patient()
  returns trigger language plpgsql security definer
  set search_path = public, pg_temp as $$
  declare
    prev text := coalesce(current_setting('app.actor_kind', true), '');
  begin
    perform set_config('app.actor_kind', 'system', true);
    update public.appointments
      set patient_user_id = new.user_id
      where patient_id = new.id;
    perform set_config('app.actor_kind', prev, true);
    return null;
  exception when others then
    perform set_config('app.actor_kind', prev, true);
    raise;
  end;
  $$;

drop trigger if exists patients_sync_appointment_links on public.patients;
create trigger patients_sync_appointment_links
  after update of user_id on public.patients
  for each row when (new.user_id is distinct from old.user_id)
  execute function app.sync_appointment_user_on_patient();

-- ---------------------------------------------------------------------------
--  5. Reference tables -- world-readable, staff-writable
-- ---------------------------------------------------------------------------

do $$
declare tbl text;
begin
  foreach tbl in array array[
    'specialties', 'insurance_carriers', 'insurance_plans', 'insurance_aliases',
    'insurance_regions', 'billing_plans', 'addons', 'bundles', 'bundle_items',
    'permissions', 'feature_flags', 'announcements'
  ]
  loop
    execute format('alter table public.%I enable row level security', tbl);
    execute format('alter table public.%I force row level security', tbl);
    execute format('drop policy if exists %I on public.%I', tbl || '_read', tbl);
    execute format('drop policy if exists %I on public.%I', tbl || '_write', tbl);
    execute format('create policy %I on public.%I for select using (true)', tbl || '_read', tbl);
    execute format(
      'create policy %I on public.%I for all using (app.is_internal() or app.is_system()) '
      || 'with check (app.is_internal() or app.is_system())',
      tbl || '_write', tbl);
  end loop;
end;
$$;

-- Roles are either system-wide (organization_id is null) or tenant-owned.
alter table public.roles enable row level security;
alter table public.roles force row level security;
drop policy if exists roles_read on public.roles;
create policy roles_read on public.roles for select using (
  organization_id is null or app.can_access_org(organization_id)
);
/*
 * A tenant may only write its own roles -- the `organization_id is not null`
 * clause is what stops one from minting a system role. Internal staff and the
 * seed script write the system roles themselves, which is why they need their
 * own branch: without it `organization_id is null` fails every check and the
 * system roles cannot be created by anyone at all.
 */
drop policy if exists roles_write on public.roles;
create policy roles_write on public.roles for all
  using (
    app.is_internal() or app.is_system()
    or (organization_id is not null and app.can_access_org(organization_id))
  )
  with check (
    app.is_internal() or app.is_system()
    or (organization_id is not null and app.can_access_org(organization_id))
  );

alter table public.role_permissions enable row level security;
alter table public.role_permissions force row level security;
drop policy if exists role_permissions_access on public.role_permissions;
create policy role_permissions_access on public.role_permissions for all
  using (exists (select 1 from public.roles r where r.id = role_permissions.role_id))
  with check (exists (select 1 from public.roles r where r.id = role_permissions.role_id));

-- Memberships: a user sees their own; an org sees all of its own.
alter table public.memberships enable row level security;
alter table public.memberships force row level security;
drop policy if exists memberships_access on public.memberships;
create policy memberships_access on public.memberships for select using (
  user_id = app.current_user_id() or app.can_access_org(organization_id)
);
drop policy if exists memberships_write on public.memberships;
create policy memberships_write on public.memberships for all
  using (app.can_access_org(organization_id))
  with check (app.can_access_org(organization_id));

-- Infrastructure tables: system actors only.
do $$
declare tbl text;
begin
  foreach tbl in array array['webhook_events', 'search_index_jobs', 'geocode_cache', 'suppression_list']
  loop
    execute format('alter table public.%I enable row level security', tbl);
    execute format('alter table public.%I force row level security', tbl);
    execute format('drop policy if exists %I on public.%I', tbl || '_system', tbl);
    execute format(
      'create policy %I on public.%I for all using (app.is_system() or app.is_internal()) '
      || 'with check (app.is_system() or app.is_internal())',
      tbl || '_system', tbl);
  end loop;
end;
$$;

-- Onboarding sessions belong to the applicant until an org exists.
alter table public.onboarding_sessions enable row level security;
alter table public.onboarding_sessions force row level security;
drop policy if exists onboarding_sessions_access on public.onboarding_sessions;
create policy onboarding_sessions_access on public.onboarding_sessions for all using (
  app.is_internal() or app.is_system()
  or user_id = app.current_user_id()
  or (organization_id is not null and app.can_access_org(organization_id))
) with check (
  app.is_internal() or app.is_system()
  or user_id = app.current_user_id()
  or (organization_id is not null and app.can_access_org(organization_id))
);

-- Provider transfers are visible to both sides of the move.
alter table public.provider_transfers enable row level security;
alter table public.provider_transfers force row level security;
drop policy if exists provider_transfers_access on public.provider_transfers;
create policy provider_transfers_access on public.provider_transfers for all using (
  app.is_internal() or app.is_system()
  or app.can_access_org(current_organization_id)
  or app.can_access_org(target_organization_id)
) with check (
  app.is_internal() or app.is_system()
  or app.can_access_org(current_organization_id)
  or app.can_access_org(target_organization_id)
);

-- ---------------------------------------------------------------------------
--  6. Integrity constraints the type system cannot express
-- ---------------------------------------------------------------------------

alter table public.reviews drop constraint if exists reviews_rating_range;
alter table public.reviews add constraint reviews_rating_range
  check (rating between 1 and 5);

alter table public.visit_reasons drop constraint if exists visit_reasons_duration_allowed;
alter table public.visit_reasons add constraint visit_reasons_duration_allowed
  check (duration_minutes in (15, 30, 60, 90, 120));

alter table public.appointments drop constraint if exists appointments_time_order;
alter table public.appointments add constraint appointments_time_order
  check (ends_at > starts_at);

alter table public.availability_rules drop constraint if exists availability_rules_time_order;
alter table public.availability_rules add constraint availability_rules_time_order
  check (end_time > start_time);

alter table public.availability_rules drop constraint if exists availability_rules_weekday_range;
alter table public.availability_rules add constraint availability_rules_weekday_range
  check (weekday between 0 and 6);

alter table public.booking_holds drop constraint if exists booking_holds_time_order;
alter table public.booking_holds add constraint booking_holds_time_order
  check (ends_at > starts_at);

alter table public.patient_dependents drop constraint if exists patient_dependents_not_self;
alter table public.patient_dependents add constraint patient_dependents_not_self
  check (guardian_patient_id <> dependent_patient_id);

alter table public.provider_transfers drop constraint if exists provider_transfers_distinct_orgs;
alter table public.provider_transfers add constraint provider_transfers_distinct_orgs
  check (current_organization_id <> target_organization_id
         or current_facility_id is distinct from target_facility_id);

alter table public.feature_flags drop constraint if exists feature_flags_rollout_range;
alter table public.feature_flags add constraint feature_flags_rollout_range
  check (rollout_percentage between 0 and 100);

/*
 * Double booking. An exclusion constraint is the only reliable guard -- two
 * concurrent requests both pass a SELECT-then-INSERT check, and the database
 * has to be the one that says no.
 *
 * Scoped to a provider, and only for statuses that actually hold a slot.
 */
create extension if not exists btree_gist;

alter table public.appointments drop constraint if exists appointments_no_provider_overlap;
alter table public.appointments add constraint appointments_no_provider_overlap
  exclude using gist (
    provider_id with =,
    tstzrange(starts_at, ends_at) with &&
  )
  where (
    provider_id is not null
    and deleted_at is null
    -- 'rescheduled' is deliberately absent. It marks an appointment that has
    -- been SUPERSEDED by a newer row pointing back at it through
    -- rescheduled_from_id -- so it must release its slot. Including it here
    -- meant every reschedule permanently blocked the time it moved away from.
    and status in ('requested', 'confirmed', 'checked_in')
  );

-- ---------------------------------------------------------------------------
--  7. Grants
--
--  The app role gets DML on every table but no DDL, and no UPDATE or DELETE on
--  the audit tables. Ownership stays with careondeck_owner so that RLS is
--  actually enforced against the app role.
-- ---------------------------------------------------------------------------

grant select, insert, update, delete on all tables in schema public to careondeck_app;
grant usage, select on all sequences in schema public to careondeck_app;

revoke update, delete on public.audit_logs from careondeck_app;
revoke update, delete on public.phi_access_logs from careondeck_app;
revoke update, delete on public.appointment_events from careondeck_app;

alter default privileges in schema public
  grant select, insert, update, delete on tables to careondeck_app;
alter default privileges in schema public
  grant usage, select on sequences to careondeck_app;

commit;
