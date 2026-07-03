-- DailyPlanner cloud sync schema
-- Run this file once in the Supabase SQL editor.

create extension if not exists pgcrypto;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  display_name text,
  updated_at timestamptz not null default now()
);

create table if not exists public.households (
  id uuid primary key default gen_random_uuid(),
  invite_code text not null unique,
  created_by uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  constraint invite_code_format check (invite_code ~ '^[A-Z0-9]{6}$')
);

create table if not exists public.household_members (
  household_id uuid not null references public.households(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  joined_at timestamptz not null default now(),
  primary key (household_id, user_id),
  unique (user_id)
);

create table if not exists public.plan_backups (
  household_id uuid primary key references public.households(id) on delete cascade,
  data jsonb not null,
  updated_at timestamptz not null default now(),
  updated_by uuid not null references auth.users(id) on delete restrict
);

create index if not exists household_members_user_id_idx on public.household_members(user_id);
create index if not exists household_members_household_id_idx on public.household_members(household_id);
create index if not exists households_invite_code_idx on public.households(invite_code);

create or replace function public.touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists profiles_touch_updated_at on public.profiles;
create trigger profiles_touch_updated_at
before update on public.profiles
for each row execute function public.touch_updated_at();

drop trigger if exists plan_backups_touch_updated_at on public.plan_backups;
create trigger plan_backups_touch_updated_at
before update on public.plan_backups
for each row execute function public.touch_updated_at();

alter table public.profiles enable row level security;
alter table public.households enable row level security;
alter table public.household_members enable row level security;
alter table public.plan_backups enable row level security;

create or replace function public.is_household_member(p_household_id uuid, p_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.household_members hm
    where hm.household_id = p_household_id
      and hm.user_id = p_user_id
  );
$$;

create or replace function public.is_household_creator(p_household_id uuid, p_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.households h
    where h.id = p_household_id
      and h.created_by = p_user_id
  );
$$;

create or replace function public.share_household(p_left_user uuid, p_right_user uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.household_members left_member
    join public.household_members right_member
      on right_member.household_id = left_member.household_id
    where left_member.user_id = p_left_user
      and right_member.user_id = p_right_user
  );
$$;

drop policy if exists "profiles_select_household" on public.profiles;
create policy "profiles_select_household"
on public.profiles
for select
to authenticated
using (id = auth.uid() or public.share_household(auth.uid(), id));

drop policy if exists "profiles_insert_own" on public.profiles;
create policy "profiles_insert_own"
on public.profiles
for insert
to authenticated
with check (id = auth.uid());

drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own"
on public.profiles
for update
to authenticated
using (id = auth.uid())
with check (id = auth.uid());

drop policy if exists "households_select_members" on public.households;
create policy "households_select_members"
on public.households
for select
to authenticated
using (created_by = auth.uid() or public.is_household_member(id, auth.uid()));

drop policy if exists "households_insert_creator" on public.households;
create policy "households_insert_creator"
on public.households
for insert
to authenticated
with check (created_by = auth.uid());

drop policy if exists "households_update_members" on public.households;
create policy "households_update_members"
on public.households
for update
to authenticated
using (public.is_household_member(id, auth.uid()))
with check (public.is_household_member(id, auth.uid()));

drop policy if exists "household_members_select_members" on public.household_members;
create policy "household_members_select_members"
on public.household_members
for select
to authenticated
using (public.is_household_member(household_id, auth.uid()) or user_id = auth.uid());

drop policy if exists "household_members_insert_self" on public.household_members;
create policy "household_members_insert_self"
on public.household_members
for insert
to authenticated
with check (user_id = auth.uid() and public.is_household_creator(household_id, auth.uid()));

drop policy if exists "household_members_delete_self" on public.household_members;
create policy "household_members_delete_self"
on public.household_members
for delete
to authenticated
using (user_id = auth.uid());

drop policy if exists "plan_backups_select_members" on public.plan_backups;
create policy "plan_backups_select_members"
on public.plan_backups
for select
to authenticated
using (public.is_household_member(household_id, auth.uid()));

drop policy if exists "plan_backups_insert_members" on public.plan_backups;
create policy "plan_backups_insert_members"
on public.plan_backups
for insert
to authenticated
with check (public.is_household_member(household_id, auth.uid()) and updated_by = auth.uid());

drop policy if exists "plan_backups_update_members" on public.plan_backups;
create policy "plan_backups_update_members"
on public.plan_backups
for update
to authenticated
using (public.is_household_member(household_id, auth.uid()))
with check (public.is_household_member(household_id, auth.uid()) and updated_by = auth.uid());

create or replace function public.join_household(p_invite_code text)
returns table (household_id uuid)
language plpgsql
security definer
set search_path = public
as $$
declare
  target_household_id uuid;
  current_user_id uuid;
begin
  current_user_id := auth.uid();
  if current_user_id is null then
    raise exception 'not_authenticated' using errcode = '28000';
  end if;

  select h.id
  into target_household_id
  from public.households h
  where h.invite_code = upper(trim(p_invite_code))
  limit 1;

  if target_household_id is null then
    raise exception 'invalid_invite_code' using errcode = '22023';
  end if;

  delete from public.household_members
  where user_id = current_user_id
    and household_id <> target_household_id;

  insert into public.household_members (household_id, user_id)
  values (target_household_id, current_user_id)
  on conflict (household_id, user_id) do nothing;

  return query select target_household_id;
end;
$$;

grant usage on schema public to anon, authenticated;
grant execute on function public.join_household(text) to authenticated;
grant execute on function public.is_household_member(uuid, uuid) to authenticated;
grant execute on function public.share_household(uuid, uuid) to authenticated;
grant execute on function public.is_household_creator(uuid, uuid) to authenticated;
