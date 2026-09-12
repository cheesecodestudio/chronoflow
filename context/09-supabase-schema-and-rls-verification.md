# Supabase Timer Schema and RLS Verification

## Scope

This document records verification evidence for GitHub Issue #13, covering:

- the `public.timer_type` enum;
- the `public.timers` schema;
- database integrity constraints;
- the foreign key to `auth.users`;
- row-level security (RLS) ownership policies.

This verification does not yet cover:

- Auth UI;
- `SupabaseTimerRepository`;
- replacement of LocalStorage;
- automated pgTAP tests;
- local Docker-based Supabase validation;
- production application integration.

## Migration

- Migration: `supabase/migrations/20260912044250_create_timers_schema_rls.sql`
- Supabase project: Chronoflow
- Region: `us-east-1`

`supabase db push --dry-run` showed exactly one pending migration. `supabase db push` applied it successfully, and remote schema inspection confirmed the resulting database objects.

No passwords, API keys, JWTs, service-role keys, or temporary user IDs are recorded here.

## Schema Verification

Remote inspection verified the following objects and definitions.

**Enum**

- `public.timer_type`
- `counter`
- `countdown`

**Table**

- `public.timers`

**Columns**

- `id`
- `user_id`
- `type`
- `title`
- `time_zone`
- `position`
- `start_at`
- `target_at`
- `accent`
- `icon`
- `created_at`
- `updated_at`

**Constraints**

- primary key on `id`;
- foreign key from `user_id` to `auth.users(id)` with `ON DELETE CASCADE`;
- trimmed title length from 1 through 100 characters;
- `position >= 0`;
- `counter` requires `start_at` and forbids `target_at`;
- `countdown` requires `target_at` and forbids `start_at`;
- unique constraint on `(user_id, position)`.

## Constraint Verification

The following negative tests were executed against the remote database:

1. A `counter` with a `NULL` `start_at` was rejected with PostgreSQL SQLSTATE `23514` by `timers_type_dates_check`.
2. A `countdown` with `position = -1` was rejected with PostgreSQL SQLSTATE `23514` by `timers_position_check`.
3. A whitespace-only title was rejected with PostgreSQL SQLSTATE `23514` by `timers_title_check`.
4. A structurally valid timer referencing a nonexistent auth user was rejected with PostgreSQL SQLSTATE `23503` by `timers_user_id_fkey`.

The `CHECK` constraints enforce timer row validity, while the foreign key enforces owner existence. Neither mechanism substitutes for RLS authorization.

## RLS Verification

RLS is enabled on `public.timers`.

**SELECT**

- An authenticated user can read their own timers.
- Another user's timers are not visible.

**INSERT**

- An authenticated user can insert their own timer.
- Inserting a timer owned by another user is rejected with PostgreSQL SQLSTATE `42501`.

**UPDATE**

- An authenticated user can update their own timer.
- Another user's timer is not visible or updatable.
- Changing an owned timer's `user_id` to another user is rejected with PostgreSQL SQLSTATE `42501`.

**DELETE**

- An authenticated user can delete their own timer.
- Another user's timer is not visible or deletable.

`USING` controls access to existing rows. `WITH CHECK` validates the resulting row. The UPDATE policy uses both expressions to prevent ownership transfer.

These results apply to authenticated user contexts. They do not claim that service-role or administrative contexts, which may bypass RLS, are protected by these policies.

## Cleanup

Temporary verification data was removed. Final verification showed:

- timers test row count: `0`;
- temporary auth user count: `0`.

## Deferred Local Validation

Local `supabase start` and `supabase db reset --local` validation was attempted but blocked because the machine's firmware virtualization support is currently disabled. Docker-based local validation has therefore been deliberately deferred and must not be considered passing.

The migration was instead validated against the dedicated Chronoflow Supabase Cloud project. Automated pgTAP/database tests remain future work and should be added when the local container runtime is available.

## Result

| Verification | Result |
| --- | --- |
| Schema migration | PASS |
| Schema inspection | PASS |
| Constraint behavior | PASS |
| Foreign key behavior | PASS |
| RLS ownership isolation | PASS |
| Cleanup | PASS |
| Local Docker reproducibility | DEFERRED |
| Automated database tests | NOT YET IMPLEMENTED |
