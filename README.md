# CareOndeck

A healthcare marketplace and practice platform: patients find and book care,
offices run their schedule, and CareOndeck operates the whole thing from a
Control Center.

Built as one Next.js application. The API lives under `/api/v1` today; the
frontend joins it in the same codebase once the Figma designs land, sharing
types with the server rather than re-declaring them.

## Stack

| Layer | Choice | Why |
|---|---|---|
| Runtime | Next.js 15 (App Router), TypeScript | One codebase for API and frontend; shared types end to end |
| Database | PostgreSQL | Row-level security for tenant isolation, real transactions, exclusion constraints |
| Data access | Drizzle ORM | SQL-first, typed, readable migrations |
| Search | Typesense | Typo tolerance, facets and geo sort for the marketplace |
| Auth | Firebase Auth + server sessions | Firebase verifies credentials; we own the session so it can be revoked |
| Payments | Stripe | Source of truth for money; our tables mirror it from webhooks |
| Messaging | Postmark (transactional), Amazon SES (bulk), Telnyx (SMS/OTP) | |
| Media | S3 + Amazon Rekognition | Every upload is screened before it can be served |

## Getting started

### 1. Database

Postgres skips row-level security entirely for superusers and `BYPASSRLS`
roles -- which is usually what a hosted provider hands you. The application
must therefore connect as its own unprivileged role, or every policy in
`drizzle/sql/rls.sql` is decoration. One connection string is fine to get
started (`npm run db:check` will tell you where you stand); split the roles
before anything real goes in.

```sql
create role careondeck_owner login password 'change-me';
create role careondeck_app   login password 'change-me'
  nosuperuser nocreatedb nocreaterole noinherit;

create database careondeck owner careondeck_owner;
\c careondeck
grant usage on schema public to careondeck_app;
```

### 2. Environment

```bash
cp .env.example .env
```

Fill in `DATABASE_URL` (the app role) and `DATABASE_URL_MIGRATOR` (the owner),
then confirm the database is reachable and the roles are set up correctly:

```bash
npm run db:check
```

It fails loudly if the app role is a superuser or owns the tables -- either
would make Postgres skip row-level security -- and tells you how to fix it.

Generate the PHI key:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

Integration keys are optional -- an adapter without credentials throws
`IntegrationNotConfiguredError` rather than failing halfway through, so local
development runs with most of them switched off.

### 3. Install and migrate

```bash
npm install
npm run db:generate     # build the migration from the Drizzle schema
npm run db:migrate      # apply it, as the owner role
npm run db:rls          # deferred FKs, RLS policies, CHECK constraints, grants
npm run db:seed         # permission catalogue and system roles
npm run db:verify       # prove tenant isolation actually holds
npm run dev
```

`npm run db:rls` is idempotent and must be re-run after **every** migration --
that is how a newly added table picks up its tenant policies.

`db:verify` creates two tenants and asks Postgres directly whether one can
reach the other's rows, then cleans up after itself. Run it in CI after every
migration -- a missing policy on a new table is exactly what it catches.

Check the app came up:

```bash
curl localhost:3000/api/health
```

## Commands

| Command | What it does |
|---|---|
| `npm run dev` | Development server |
| `npm run typecheck` | `tsc --noEmit` |
| `npm run lint` | ESLint |
| `npm run db:check` | Connectivity and role-safety check for the configured database |
| `npm run db:generate` | Generate a migration from schema changes |
| `npm run db:migrate` | Apply pending migrations |
| `npm run db:rls` | Apply constraints, RLS policies and grants |
| `npm run db:seed` | Seed permissions and system roles |
| `npm run db:verify` | Prove tenant isolation against the real database |
| `npm run db:verify:auth` | Exercise the OTP, session and sign-out flows through the service layer |
| `npm run try:auth` | Hit the live auth endpoints over HTTP (needs `npm run dev` running) |
| `npm run db:studio` | Drizzle Studio |

## Layout

```
src/
  app/
    api/
      health/route.ts
      v1/                     89 route handlers, grouped by IA section
  server/
    auth/                     sessions, request context, permission catalogue
    config/env.ts             Zod-validated environment; fails fast on boot
    db/
      client.ts               pooled connection + Drizzle handle
      tenant.ts               withTenant / withPublic / withInternal / withSystem
      schema/                 18 files, one per domain
    http/                     defineRoute, error taxonomy, response envelope
    integrations/             one adapter per external service
    modules/                  domain services, one folder per IA section
    observability/            logger, audit + PHI access recording
    security/phi.ts           column-level encryption
drizzle/
  sql/constraints.sql         FKs that would be circular imports in TypeScript
  sql/rls.sql                 row-level security, CHECKs, grants
```

## Conventions

**Never import `db` in feature code.** It runs with no tenant GUC set, so RLS
sees a null org and returns nothing. Go through `withTenant`, `withPublic`,
`withInternal` or `withSystem` — which is what `defineRoute` already does.

**Routes stay thin.** Validate, delegate to a module service, respond. Behaviour
lives in the service so it can be tested without an HTTP layer.

**Audit in the same transaction as the change.** `recordAudit(tx, ...)` takes the
caller's transaction on purpose: if the change rolls back so does its audit row.

**Money in integer cents.** Never a float.

**Unimplemented endpoints return 501.** A screen wired to an unfinished endpoint
should fail visibly, not render plausible fake data nobody notices until launch.

## Status

Done: schema for all domains (83 tables), tenancy and RLS, auth and permission
model, HTTP layer, adapter interfaces for all ten external services, and 89
routed endpoints. Verified against a real Postgres 18: the full
migrate -> rls -> seed -> verify path runs clean and all isolation checks pass.

Since then: sign-up, sign-in and password flows; the patient home, account and
booking screens; and provider onboarding end to end, from sign-up to Submit for
Review. Not done: Control Center (provider approvals first), the provider
dashboard, and the endpoints behind booking, which still return 501.
