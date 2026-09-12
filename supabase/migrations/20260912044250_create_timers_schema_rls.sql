create type public.timer_type as enum (
  'counter',
  'countdown'
);

create table public.timers (
  id uuid primary key default gen_random_uuid(),

  user_id uuid not null
    default auth.uid()
    references auth.users(id)
    on delete cascade,

  type public.timer_type not null,

  title text not null,
  time_zone text not null,

  position bigint not null,

  start_at timestamptz,
  target_at timestamptz,

  accent text,
  icon text,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint timers_title_check
    check (
      char_length(btrim(title)) between 1 and 100
    ),

  constraint timers_position_check
    check (
      position >= 0
    ),

  constraint timers_type_dates_check
    check (
      (
        type = 'counter'::public.timer_type
        and start_at is not null
        and target_at is null
      )
      or
      (
        type = 'countdown'::public.timer_type
        and target_at is not null
        and start_at is null
      )
    ),

  constraint timers_user_position_unique
    unique (user_id, position)
);

alter table public.timers
enable row level security;

revoke all on table public.timers
from anon, authenticated;

grant select, insert, update, delete
on table public.timers
to authenticated;

create policy "Users can read their own timers"
on public.timers
for select
to authenticated
using (
  (select auth.uid()) = user_id
);

create policy "Users can create their own timers"
on public.timers
for insert
to authenticated
with check (
  (select auth.uid()) = user_id
);

create policy "Users can update their own timers"
on public.timers
for update
to authenticated
using (
  (select auth.uid()) = user_id
)
with check (
  (select auth.uid()) = user_id
);

create policy "Users can delete their own timers"
on public.timers
for delete
to authenticated
using (
  (select auth.uid()) = user_id
);
